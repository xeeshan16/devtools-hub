import { describe, expect, it } from "vitest";
import {
  escapeToken,
  evaluateJsonPointer,
  formatPointer,
  jsonType,
  listPointers,
  parsePointer,
  resolvePointer,
  toFragment,
  type PointerMatch,
} from "./json-pointer";
import type { ToolResult } from "./result";

// The example document from RFC 6901 §5.
const RFC_DOC = {
  foo: ["bar", "baz"],
  "": 0,
  "a/b": 1,
  "c%d": 2,
  "e^f": 3,
  "g|h": 4,
  "i\\j": 5,
  'k"l': 6,
  " ": 7,
  "m~n": 8,
};
const RFC_JSON = JSON.stringify(RFC_DOC);

function matched(result: ToolResult<PointerMatch | null>): PointerMatch {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  if (!result.value) throw new Error("expected a match, got null");
  return result.value;
}

function errorOf(result: ToolResult<unknown>): string {
  if (result.ok) throw new Error("expected an error");
  return result.error;
}

describe("parsePointer", () => {
  it("treats the empty string and a lone # as the whole document", () => {
    expect(parsePointer("")).toEqual({ ok: true, value: [] });
    expect(parsePointer("#")).toEqual({ ok: true, value: [] });
  });

  it("splits on / and keeps empty tokens", () => {
    expect(parsePointer("/foo/0")).toEqual({ ok: true, value: ["foo", "0"] });
    expect(parsePointer("/")).toEqual({ ok: true, value: [""] });
    expect(parsePointer("/a//b")).toEqual({ ok: true, value: ["a", "", "b"] });
  });

  it("decodes ~1 before ~0", () => {
    expect(parsePointer("/a~1b/m~0n")).toEqual({ ok: true, value: ["a/b", "m~n"] });
    expect(parsePointer("/~01")).toEqual({ ok: true, value: ["~1"] });
  });

  it("percent-decodes the URI fragment form", () => {
    expect(parsePointer("#/c%25d")).toEqual({ ok: true, value: ["c%d"] });
    expect(parsePointer("#/%20")).toEqual({ ok: true, value: [" "] });
    expect(parsePointer("#/a~1b")).toEqual({ ok: true, value: ["a/b"] });
  });

  it("does not percent-decode the plain string form", () => {
    expect(parsePointer("/c%25d")).toEqual({ ok: true, value: ["c%25d"] });
  });

  it("rejects pointers that don't start with /", () => {
    expect(errorOf(parsePointer("foo/0"))).toMatch(/must be empty or start with "\/"\. Did you mean "\/foo\/0"\?/);
  });

  it("rejects ~ not followed by 0 or 1", () => {
    expect(errorOf(parsePointer("/a~2"))).toMatch(/"~" must be followed by 0/);
    expect(errorOf(parsePointer("/a~"))).toMatch(/"~" must be followed by 0/);
  });

  it("rejects malformed percent-encoding in fragments", () => {
    expect(errorOf(parsePointer("#/%E0%A4%A"))).toMatch(/percent-encoding/);
  });
});

describe("escapeToken / formatPointer / toFragment", () => {
  it("escapes ~ before /", () => {
    expect(escapeToken("~/")).toBe("~0~1");
    expect(escapeToken("plain")).toBe("plain");
  });

  it("round-trips through parsePointer", () => {
    const tokens = ["a/b", "m~n", "", "~1", "0"];
    expect(parsePointer(formatPointer(tokens))).toEqual({ ok: true, value: tokens });
    expect(parsePointer(toFragment(tokens))).toEqual({ ok: true, value: tokens });
  });

  it("matches the RFC 6901 §6 fragment examples", () => {
    expect(toFragment([])).toBe("#");
    expect(toFragment(["a/b"])).toBe("#/a~1b");
    expect(toFragment(["c%d"])).toBe("#/c%25d");
    expect(toFragment(["e^f"])).toBe("#/e%5Ef");
    expect(toFragment(["g|h"])).toBe("#/g%7Ch");
    expect(toFragment(["i\\j"])).toBe("#/i%5Cj");
    expect(toFragment(['k"l'])).toBe("#/k%22l");
    expect(toFragment([" "])).toBe("#/%20");
    expect(toFragment(["m~n"])).toBe("#/m~0n");
  });
});

describe("resolvePointer", () => {
  it("evaluates every RFC 6901 §5 example", () => {
    const cases: [string, unknown][] = [
      ["", RFC_DOC],
      ["/foo", ["bar", "baz"]],
      ["/foo/0", "bar"],
      ["/", 0],
      ["/a~1b", 1],
      ["/c%d", 2],
      ["/e^f", 3],
      ["/g|h", 4],
      ["/i\\j", 5],
      ['/k"l', 6],
      ["/ ", 7],
      ["/m~0n", 8],
    ];
    for (const [pointer, expected] of cases) {
      const tokens = parsePointer(pointer);
      if (!tokens.ok) throw new Error(tokens.error);
      expect(resolvePointer(RFC_DOC, tokens.value), pointer).toEqual({ ok: true, value: expected });
    }
  });

  it("returns falsy values rather than treating them as missing", () => {
    expect(resolvePointer({ a: null, b: false, c: "" }, ["a"])).toEqual({ ok: true, value: null });
    expect(resolvePointer({ a: null, b: false, c: "" }, ["b"])).toEqual({ ok: true, value: false });
    expect(resolvePointer({ a: null, b: false, c: "" }, ["c"])).toEqual({ ok: true, value: "" });
  });

  it("names the missing member and where it was looked up", () => {
    expect(errorOf(resolvePointer({ a: { b: 1 } }, ["a", "x"]))).toBe('No member "x" in the object at "/a".');
    expect(errorOf(resolvePointer({}, ["x"]))).toBe('No member "x" in the object at the root.');
  });

  it("does not resolve inherited properties", () => {
    expect(resolvePointer({}, ["toString"]).ok).toBe(false);
    expect(resolvePointer({}, ["__proto__"]).ok).toBe(false);
    expect(resolvePointer(JSON.parse('{"__proto__": 1}'), ["__proto__"])).toEqual({ ok: true, value: 1 });
  });

  it("rejects array indexes with leading zeros, signs or letters", () => {
    for (const token of ["01", "-1", "+1", "1.0", "a", ""]) {
      expect(errorOf(resolvePointer(["x", "y"], [token])), token).toMatch(/must be an index like 0 or 12/);
    }
  });

  it("reports out-of-range indexes with the array length", () => {
    expect(errorOf(resolvePointer({ foo: ["bar", "baz"] }, ["foo", "2"]))).toBe('Index 2 is out of range: the array at "/foo" has 2 items.');
    expect(errorOf(resolvePointer([1], ["5"]))).toMatch(/has 1 item\.$/);
  });

  it("explains that - never exists when reading", () => {
    expect(errorOf(resolvePointer([1, 2], ["-"]))).toMatch(/element after the last one/);
  });

  it("errors when stepping into a scalar or null", () => {
    expect(errorOf(resolvePointer({ a: 1 }, ["a", "b"]))).toBe('The value at "/a" is a number, so it has no child "b".');
    expect(errorOf(resolvePointer({ a: null }, ["a", "b"]))).toBe('The value at "/a" is null, so it has no child "b".');
  });
});

describe("evaluateJsonPointer", () => {
  it("returns null for empty JSON", () => {
    expect(evaluateJsonPointer("  ", "/a")).toEqual({ ok: true, value: null });
  });

  it("reports JSON syntax errors", () => {
    expect(errorOf(evaluateJsonPointer('{\n  "a": }', "/a"))).toMatch(/Unexpected token/);
  });

  it("returns the value, its type, and canonical pointer forms", () => {
    const match = matched(evaluateJsonPointer(RFC_JSON, "#/a~1b"));
    expect(match).toEqual({
      tokens: ["a/b"],
      pointer: "/a~1b",
      fragment: "#/a~1b",
      type: "number",
      json: "1",
    });
  });

  it("pretty-prints container values", () => {
    const match = matched(evaluateJsonPointer(RFC_JSON, "/foo"));
    expect(match.type).toBe("array");
    expect(match.json).toBe('[\n  "bar",\n  "baz"\n]');
  });

  it("trims surrounding whitespace from the pointer", () => {
    expect(matched(evaluateJsonPointer(RFC_JSON, "  /foo/1\n")).json).toBe('"baz"');
  });

  it("passes pointer and lookup errors through", () => {
    expect(errorOf(evaluateJsonPointer(RFC_JSON, "foo"))).toMatch(/must be empty or start with/);
    expect(errorOf(evaluateJsonPointer(RFC_JSON, "/nope"))).toMatch(/No member "nope"/);
  });
});

describe("jsonType", () => {
  it("classifies every JSON type", () => {
    expect([{}, [], "", 0, true, null].map(jsonType)).toEqual(["object", "array", "string", "number", "boolean", "null"]);
  });
});

describe("listPointers", () => {
  it("lists every value depth first, escaping keys", () => {
    const { entries, truncated } = listPointers({ a: [1, { "b/c": "x" }], "m~n": null });
    expect(truncated).toBe(false);
    expect(entries).toEqual([
      { pointer: "", type: "object", preview: "{2 keys}" },
      { pointer: "/a", type: "array", preview: "[2 items]" },
      { pointer: "/a/0", type: "number", preview: "1" },
      { pointer: "/a/1", type: "object", preview: "{1 key}" },
      { pointer: "/a/1/b~1c", type: "string", preview: '"x"' },
      { pointer: "/m~0n", type: "null", preview: "null" },
    ]);
  });

  it("produces pointers that resolve back to their values", () => {
    const { entries } = listPointers(RFC_DOC);
    for (const entry of entries) {
      const tokens = parsePointer(entry.pointer);
      if (!tokens.ok) throw new Error(tokens.error);
      expect(resolvePointer(RFC_DOC, tokens.value).ok, entry.pointer).toBe(true);
    }
    expect(entries).toHaveLength(13);
  });

  it("shortens long string previews", () => {
    const { entries } = listPointers({ s: "x".repeat(100) });
    expect(entries[1].preview).toHaveLength(60);
    expect(entries[1].preview.endsWith("...")).toBe(true);
  });

  it("stops at the limit and says so", () => {
    const { entries, truncated } = listPointers(Array.from({ length: 50 }, (_, i) => i), 10);
    expect(entries).toHaveLength(10);
    expect(truncated).toBe(true);
  });
});
