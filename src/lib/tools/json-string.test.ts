import { describe, expect, it } from "vitest";
import { escapeJsonString, unescapeJsonString } from "./json-string";

function value(result: { ok: true; value: string } | { ok: false; error: string }) {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.value;
}

function error(result: { ok: true; value: string } | { ok: false; error: string }) {
  if (result.ok) throw new Error(`expected an error, got: ${result.value}`);
  return result.error;
}

describe("escapeJsonString", () => {
  it("escapes quotes, backslashes and control characters", () => {
    expect(escapeJsonString('say "hi"\n\tC:\\temp')).toBe('say \\"hi\\"\\n\\tC:\\\\temp');
  });

  it("writes other control characters as \\u escapes", () => {
    expect(escapeJsonString("a\u0000b\u001f")).toBe("a\\u0000b\\u001f");
  });

  it("leaves non-ASCII text and forward slashes alone by default", () => {
    expect(escapeJsonString("Zoë </script> 😀")).toBe("Zoë </script> 😀");
  });

  it("wraps the result in quotes on request", () => {
    expect(escapeJsonString("a\"b", { quotes: true })).toBe('"a\\"b"');
    expect(escapeJsonString("", { quotes: true })).toBe('""');
  });

  it("escapes everything outside printable ASCII in ASCII-only mode", () => {
    expect(escapeJsonString("é\u2028\u007f😀", { asciiOnly: true })).toBe(
      "\\u00e9\\u2028\\u007f\\ud83d\\ude00",
    );
  });

  it("escapes a lone surrogate instead of producing invalid UTF-16", () => {
    expect(escapeJsonString("x\ud800y")).toBe("x\\ud800y");
  });

  it("produces output that JSON.parse reads back unchanged", () => {
    const samples = ['{"a":[1,"two"]}', "line1\r\nline2", "tab\there", "Zoë 😀 \u2028", "\\n is literal"];
    for (const sample of samples) {
      for (const asciiOnly of [false, true]) {
        expect(JSON.parse(escapeJsonString(sample, { quotes: true, asciiOnly }))).toBe(sample);
      }
    }
  });
});

describe("unescapeJsonString", () => {
  it("decodes the body of a JSON string", () => {
    expect(value(unescapeJsonString('{\\"id\\":1,\\"tags\\":[\\"a\\"]}'))).toBe('{"id":1,"tags":["a"]}');
  });

  it("accepts a complete literal with its surrounding quotes", () => {
    expect(value(unescapeJsonString('"say \\"hi\\"\\n"'))).toBe('say "hi"\n');
  });

  it("decodes every simple escape", () => {
    expect(value(unescapeJsonString('\\"\\\\\\/\\b\\f\\n\\r\\t'))).toBe('"\\/\b\f\n\r\t');
  });

  it("decodes \\u escapes, joining surrogate pairs into one character", () => {
    expect(value(unescapeJsonString("caf\\u00E9 \\ud83d\\ude00"))).toBe("café 😀");
  });

  it("keeps raw line breaks and tabs", () => {
    expect(value(unescapeJsonString("a\n\tb\\n"))).toBe("a\n\tb\n");
  });

  it("treats a lone quote character as text, not as an empty literal", () => {
    expect(error(unescapeJsonString('"'))).toMatch(/Unescaped double quote at line 1, column 1/);
  });

  it("returns an empty string for empty input and for an empty literal", () => {
    expect(value(unescapeJsonString(""))).toBe("");
    expect(value(unescapeJsonString('""'))).toBe("");
  });

  it("round-trips with escapeJsonString", () => {
    const sample = 'He said "hi"\r\n\\ é 😀 \u0001';
    expect(value(unescapeJsonString(escapeJsonString(sample)))).toBe(sample);
    expect(value(unescapeJsonString(escapeJsonString(sample, { quotes: true, asciiOnly: true })))).toBe(
      sample,
    );
  });

  it("rejects an unescaped quote inside the string, with its position", () => {
    expect(error(unescapeJsonString('say "hi"'))).toMatch(/Unescaped double quote at line 1, column 5/);
    expect(error(unescapeJsonString('"a"b"'))).toMatch(/line 1, column 3/);
  });

  it("rejects escapes JSON does not define", () => {
    expect(error(unescapeJsonString("a\\x41"))).toMatch(/\\x is not a valid JSON escape, at line 1, column 2/);
    expect(error(unescapeJsonString("\\'"))).toMatch(/not a valid JSON escape/);
  });

  it("rejects a short or non-hex \\u escape", () => {
    expect(error(unescapeJsonString("\\u12"))).toMatch(/four hex digits/);
    expect(error(unescapeJsonString("\\u12G4"))).toMatch(/four hex digits/);
    // The closing quote of a literal is not part of the escape.
    expect(error(unescapeJsonString('"\\u123"'))).toMatch(/four hex digits/);
  });

  it("rejects a trailing backslash", () => {
    expect(error(unescapeJsonString("abc\\"))).toMatch(/ends in the middle of an escape sequence/);
    expect(error(unescapeJsonString('"abc\\"'))).toMatch(/ends in the middle of an escape sequence/);
  });

  it("reports positions on later lines", () => {
    expect(error(unescapeJsonString("ok\nbad \\q"))).toMatch(/line 2, column 5/);
  });
});
