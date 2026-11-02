import { describe, expect, it } from "vitest";
import {
  convertDotenv,
  dotenvToJson,
  formatDotenvValue,
  jsonToDotenv,
  parseDotenv,
} from "./dotenv";

function envToObject(input: string): Record<string, string> {
  const result = dotenvToJson(input);
  if (!result.ok) throw new Error(result.error);
  return JSON.parse(result.value.output);
}

describe("parseDotenv", () => {
  it("reads plain assignments and skips blank lines and comments", () => {
    expect(envToObject("# database\nDB_HOST=localhost\n\nDB_PORT=5432\n")).toEqual({
      DB_HOST: "localhost",
      DB_PORT: "5432",
    });
  });

  it("accepts an export prefix and spaces around the equals sign", () => {
    expect(envToObject("export NODE_ENV = production\n")).toEqual({ NODE_ENV: "production" });
  });

  it("strips inline comments only when preceded by whitespace or at the start", () => {
    expect(
      envToObject("PORT=3000 # web\nTAG=v1#beta\nURL=https://example.com/a#top\nEMPTY=# nothing"),
    ).toEqual({
      PORT: "3000",
      TAG: "v1#beta",
      URL: "https://example.com/a#top",
      EMPTY: "",
    });
  });

  it("keeps single-quoted values literal", () => {
    expect(envToObject("GREETING='hello # not a comment \\n $HOME'")).toEqual({
      GREETING: "hello # not a comment \\n $HOME",
    });
  });

  it("expands escapes in double-quoted values", () => {
    expect(envToObject('MSG="line one\\nline two\\t\\"quoted\\" \\\\ \\x"')).toEqual({
      MSG: 'line one\nline two\t"quoted" \\ \\x',
    });
  });

  it("reads quoted values that span several lines", () => {
    const input = 'KEY="-----BEGIN KEY-----\nabc\n-----END KEY-----" # pem\nNEXT=1';
    expect(envToObject(input)).toEqual({
      KEY: "-----BEGIN KEY-----\nabc\n-----END KEY-----",
      NEXT: "1",
    });
  });

  it("reports the line of an entry after a multi-line value", () => {
    const result = parseDotenv("A='x\ny'\nB=2");
    if (!result.ok) throw new Error(result.error);
    expect(result.value.entries.map((e) => [e.key, e.line])).toEqual([
      ["A", 1],
      ["B", 3],
    ]);
  });

  it("leaves variable references unexpanded", () => {
    expect(envToObject("URL=http://${HOST}:$PORT")).toEqual({ URL: "http://${HOST}:$PORT" });
  });

  it("handles CRLF line endings and a byte order mark", () => {
    expect(envToObject("\uFEFFA=1\r\nB=two\r\n")).toEqual({ A: "1", B: "two" });
  });

  it("keeps the last value of a duplicated key and warns about it", () => {
    const result = dotenvToJson("A=1\nB=2\nA=3");
    if (!result.ok) throw new Error(result.error);
    expect(JSON.parse(result.value.output)).toEqual({ A: "3", B: "2" });
    expect(Object.keys(JSON.parse(result.value.output))).toEqual(["A", "B"]);
    expect(result.value.warnings).toEqual([
      "A is defined on line 1 and again on line 3; the last value wins.",
    ]);
  });

  it("rejects a line without an equals sign", () => {
    expect(parseDotenv("A=1\nJUST_A_WORD")).toEqual({
      ok: false,
      error: 'Line 2: expected KEY=value, got "JUST_A_WORD".',
    });
  });

  it("rejects keys with invalid characters", () => {
    const result = parseDotenv("MY$KEY=1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/^Line 1: "MY\$KEY" is not a valid key/);
  });

  it("rejects an unterminated quoted value", () => {
    const result = parseDotenv('A=1\nB="never closed\nC=3');
    expect(result).toEqual({
      ok: false,
      error: "Line 2: the \"-quoted value for B is never closed.",
    });
  });

  it("rejects text after a closing quote", () => {
    const result = parseDotenv("A='one' two");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('unexpected text after the closing quote for A: "two"');
  });
});

describe("dotenvToJson", () => {
  it("treats blank input as empty output", () => {
    expect(dotenvToJson("  \n")).toEqual({ ok: true, value: { output: "", warnings: [] } });
  });

  it("returns an empty object for a file of only comments", () => {
    expect(envToObject("# nothing here\n")).toEqual({});
  });
});

describe("formatDotenvValue", () => {
  it("leaves plain values bare", () => {
    expect(formatDotenvValue("postgres://user@db:5432/app")).toBe("postgres://user@db:5432/app");
    expect(formatDotenvValue("")).toBe("");
  });

  it("single-quotes values with spaces, hashes or dollar signs", () => {
    expect(formatDotenvValue("hello world")).toBe("'hello world'");
    expect(formatDotenvValue("#fff")).toBe("'#fff'");
    expect(formatDotenvValue("pa$$word")).toBe("'pa$$word'");
    expect(formatDotenvValue('say "hi"')).toBe("'say \"hi\"'");
  });

  it("double-quotes and escapes values with newlines or single quotes", () => {
    expect(formatDotenvValue("a\nb")).toBe('"a\\nb"');
    expect(formatDotenvValue("it's")).toBe('"it\'s"');
    expect(formatDotenvValue('it\'s "x" \\')).toBe('"it\'s \\"x\\" \\\\"');
  });
});

describe("jsonToDotenv", () => {
  it("writes one line per key with scalars stringified", () => {
    const result = jsonToDotenv('{"PORT":3000,"DEBUG":false,"NAME":"my app","EMPTY":null}');
    expect(result).toEqual({
      ok: true,
      value: { output: "PORT=3000\nDEBUG=false\nNAME='my app'\nEMPTY=\n", warnings: [] },
    });
  });

  it("rejects nested values", () => {
    expect(jsonToDotenv('{"A":{"B":1}}')).toEqual({
      ok: false,
      error: "A is an object; .env values must be strings, numbers or booleans.",
    });
    expect(jsonToDotenv('{"A":[1]}').ok).toBe(false);
  });

  it("rejects input that is not an object", () => {
    expect(jsonToDotenv("[1,2]").ok).toBe(false);
    expect(jsonToDotenv('"x"').ok).toBe(false);
  });

  it("rejects keys a .env file cannot hold", () => {
    expect(jsonToDotenv('{"has space":1}').ok).toBe(false);
  });

  it("reports malformed JSON", () => {
    expect(jsonToDotenv("{").ok).toBe(false);
  });

  it("round-trips awkward values back to the same object", () => {
    const original = {
      PLAIN: "abc",
      SPACES: "  padded  ",
      HASH: "a # b",
      QUOTES: `it's "both"`,
      MULTI: "line1\nline2\r\n",
      BACKSLASH: "C:\\path\\n",
      DOLLAR: "${NOT_EXPANDED}",
    };
    const env = jsonToDotenv(JSON.stringify(original));
    if (!env.ok) throw new Error(env.error);
    expect(envToObject(env.value.output)).toEqual(original);
  });
});

describe("convertDotenv", () => {
  it("dispatches on direction", () => {
    const toJson = convertDotenv("A=1", "env-to-json");
    const toEnv = convertDotenv('{"A":"1"}', "json-to-env");
    expect(toJson.ok && JSON.parse(toJson.value.output)).toEqual({ A: "1" });
    expect(toEnv.ok && toEnv.value.output).toBe("A=1\n");
  });
});
