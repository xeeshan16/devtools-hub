import { describe, expect, it } from "vitest";
import { formatJson, jsonStats, validateJson } from "./json-formatter";

describe("formatJson", () => {
  it("pretty-prints with the requested indentation", () => {
    expect(formatJson('{"a":1}', "2")).toEqual({
      ok: true,
      value: '{\n  "a": 1\n}',
    });
    expect(formatJson('{"a":1}', "4")).toEqual({
      ok: true,
      value: '{\n    "a": 1\n}',
    });
    expect(formatJson('{"a":1}', "tab")).toEqual({
      ok: true,
      value: '{\n\t"a": 1\n}',
    });
  });

  it("minifies", () => {
    expect(formatJson('{\n  "a": [1, 2]\n}', "minify")).toEqual({
      ok: true,
      value: '{"a":[1,2]}',
    });
  });

  it("treats blank input as empty rather than an error", () => {
    expect(formatJson("   \n ")).toEqual({ ok: true, value: "" });
  });

  it("reports the line and column of a syntax error", () => {
    const result = formatJson('{\n  "a": 1,\n}');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/line 3, column 1/);
      expect(result.error).not.toMatch(/at position/);
    }
  });

  it("leaves messages without a position marker alone", () => {
    // Truncated input produces an "Unexpected end of JSON input" message,
    // which carries no position to map.
    const result = formatJson("{");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeTruthy();
  });

  it("round-trips non-object top-level values", () => {
    expect(formatJson("42")).toEqual({ ok: true, value: "42" });
    expect(formatJson('"hi"')).toEqual({ ok: true, value: '"hi"' });
    expect(formatJson("null")).toEqual({ ok: true, value: "null" });
  });
});

describe("validateJson", () => {
  it("accepts valid and blank input", () => {
    expect(validateJson('{"a":1}')).toEqual({ ok: true, value: true });
    expect(validateJson("")).toEqual({ ok: true, value: true });
  });

  it("rejects trailing commas, which JavaScript would allow", () => {
    expect(validateJson('{"a":1,}').ok).toBe(false);
  });
});

describe("jsonStats", () => {
  it("counts keys, containers and depth", () => {
    const stats = jsonStats('{"a":{"b":[1,2,{"c":3}]}}');
    expect(stats).not.toBeNull();
    expect(stats).toMatchObject({ keys: 3, objects: 3, arrays: 1, depth: 4 });
  });

  it("measures size in UTF-8 bytes, not characters", () => {
    const stats = jsonStats('{"a":"é"}');
    // 'é' is two bytes in UTF-8, so bytes exceeds the 9-character length.
    expect(stats?.bytes).toBe(10);
  });

  it("returns null for invalid JSON", () => {
    expect(jsonStats("{oops}")).toBeNull();
  });

  it("reports depth 0 for a scalar document", () => {
    expect(jsonStats("42")).toMatchObject({ depth: 0, keys: 0 });
  });
});
