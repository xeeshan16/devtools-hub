import { describe, expect, it } from "vitest";
import { convertCsv, csvToJson, jsonToCsv, parseCsv } from "./csv-json";

function value<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

describe("parseCsv", () => {
  it("splits plain rows and fields", () => {
    expect(value(parseCsv("a,b,c\n1,2,3"))).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("keeps delimiters, newlines and doubled quotes inside quoted fields", () => {
    expect(value(parseCsv('"x, y","line 1\nline 2","say ""hi"""'))).toEqual([
      ["x, y", "line 1\nline 2", 'say "hi"'],
    ]);
  });

  it("accepts CRLF line endings", () => {
    expect(value(parseCsv('a,"b"\r\n1,2\r\n'))).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("does not add an empty row for a trailing newline", () => {
    expect(value(parseCsv("a\nb\n"))).toEqual([["a"], ["b"]]);
  });

  it("keeps empty fields, including a trailing one", () => {
    expect(value(parseCsv('a,,""\n1,'))).toEqual([
      ["a", "", ""],
      ["1", ""],
    ]);
  });

  it("strips a UTF-8 byte-order mark", () => {
    expect(value(parseCsv("﻿id,name"))).toEqual([["id", "name"]]);
  });

  it("supports semicolon and tab delimiters", () => {
    expect(value(parseCsv("a;b,c", ";"))).toEqual([["a", "b,c"]]);
    expect(value(parseCsv("a\tb", "\t"))).toEqual([["a", "b"]]);
  });

  it("reports an unterminated quote with the line it started on", () => {
    const result = parseCsv('a,b\n1,"open\nstill open');
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("line 2"),
    });
  });

  it("rejects a quote in the middle of an unquoted field", () => {
    const result = parseCsv('a,b\n1,5"2');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("line 2");
  });

  it("rejects text after a closing quote", () => {
    expect(parseCsv('"a"b,c').ok).toBe(false);
  });
});

describe("csvToJson", () => {
  it("uses the header row as keys and keeps every value a string", () => {
    const json = value(csvToJson("id,zip,active\n1,02134,true\n"));
    expect(JSON.parse(json)).toEqual([
      { id: "1", zip: "02134", active: "true" },
    ]);
  });

  it("returns arrays when the header option is off", () => {
    const json = value(csvToJson("a,b\n1,2", { delimiter: ",", header: false }));
    expect(JSON.parse(json)).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("skips blank lines between records", () => {
    const json = value(csvToJson("a,b\n1,2\n\n3,4\n"));
    expect(JSON.parse(json)).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("keeps an empty value in a single-column file", () => {
    const json = value(csvToJson('name\nAda\n""\nGrace'));
    expect(JSON.parse(json)).toEqual([
      { name: "Ada" },
      { name: "" },
      { name: "Grace" },
    ]);
  });

  it("returns an empty array for a header with no records", () => {
    expect(JSON.parse(value(csvToJson("a,b\n")))).toEqual([]);
  });

  it("reports the row number when a row has the wrong field count", () => {
    expect(csvToJson("a,b\n1,2\n3")).toEqual({
      ok: false,
      error: "Row 3 has 1 field, but the header has 2.",
    });
  });

  it("rejects duplicate column names instead of dropping data", () => {
    const result = csvToJson("id,id\n1,2");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('"id"');
  });

  it("treats blank input as empty output", () => {
    expect(csvToJson("  \n")).toEqual({ ok: true, value: "" });
  });
});

describe("jsonToCsv", () => {
  it("writes a header from the union of keys in first-seen order", () => {
    const csv = value(jsonToCsv('[{"a":1,"b":2},{"c":3,"a":4}]'));
    expect(csv).toBe("a,b,c\n1,2,\n4,,3");
  });

  it("writes arrays of arrays without a header", () => {
    expect(value(jsonToCsv('[["a","b"],[1,true]]'))).toBe("a,b\n1,true");
  });

  it("quotes only the fields that need it", () => {
    const csv = value(jsonToCsv('[{"note":"x, y","q":"say \\"hi\\"","n":"a\\nb","plain":"ok"}]'));
    expect(csv).toBe('note,q,n,plain\n"x, y","say ""hi""","a\nb",ok');
  });

  it("writes null as an empty field and nested values as JSON", () => {
    const csv = value(jsonToCsv('[{"a":null,"b":{"c":1},"d":[1,2]}]'));
    expect(csv).toBe('a,b,d\n,"{""c"":1}","[1,2]"');
  });

  it("quotes on the chosen delimiter rather than on commas", () => {
    expect(value(jsonToCsv('[{"a":"x;y","b":"1,5"}]', ";"))).toBe('a;b\n"x;y";1,5');
  });

  it("round-trips through csvToJson", () => {
    const original = [
      { id: "1", note: 'multi\nline, with "quotes"' },
      { id: "2", note: "" },
    ];
    const csv = value(jsonToCsv(JSON.stringify(original)));
    expect(JSON.parse(value(csvToJson(csv)))).toEqual(original);
  });

  it("rejects a non-array value", () => {
    expect(jsonToCsv('{"a":1}').ok).toBe(false);
  });

  it("rejects a mix of objects and arrays", () => {
    expect(jsonToCsv('[{"a":1},[1]]').ok).toBe(false);
  });

  it("rejects invalid JSON", () => {
    expect(jsonToCsv("[1,").ok).toBe(false);
  });

  it("treats blank input and an empty array as empty output", () => {
    expect(jsonToCsv(" ")).toEqual({ ok: true, value: "" });
    expect(jsonToCsv("[]")).toEqual({ ok: true, value: "" });
  });
});

describe("convertCsv", () => {
  it("dispatches on direction", () => {
    expect(value(convertCsv("a\n1", "csv-to-json"))).toContain('"a": "1"');
    expect(value(convertCsv('[{"a":1}]', "json-to-csv"))).toBe("a\n1");
  });
});
