import { describe, expect, it } from "vitest";
import {
  convertQueryString,
  extractQuery,
  jsonToQuery,
  parseKeyPath,
  queryToJson,
} from "./query-string";

function toObject(input: string, nested = true): unknown {
  const result = queryToJson(input, { nested });
  if (!result.ok) throw new Error(result.error);
  return JSON.parse(result.value.output);
}

function toQuery(value: unknown, arrayFormat: "repeat" | "brackets" = "repeat"): string {
  const result = jsonToQuery(JSON.stringify(value), { arrayFormat });
  if (!result.ok) throw new Error(result.error);
  return result.value.output;
}

describe("extractQuery", () => {
  it("accepts a bare query, a leading ? or a full URL, and drops the fragment", () => {
    expect(extractQuery("a=1&b=2")).toBe("a=1&b=2");
    expect(extractQuery("?a=1")).toBe("a=1");
    expect(extractQuery("  https://example.com/search?q=go&page=2#results ")).toBe("q=go&page=2");
    expect(extractQuery("https://example.com/docs#a=1")).toBe("");
  });
});

describe("parseKeyPath", () => {
  it("splits bracket keys into segments", () => {
    expect(parseKeyPath("user[address][city]")).toEqual(["user", "address", "city"]);
    expect(parseKeyPath("tags[]")).toEqual(["tags", ""]);
    expect(parseKeyPath("plain")).toEqual(["plain"]);
  });

  it("keeps keys with unbalanced or leading brackets whole", () => {
    expect(parseKeyPath("a[b")).toEqual(["a[b"]);
    expect(parseKeyPath("a[b]c")).toEqual(["a[b]c"]);
    expect(parseKeyPath("[x]")).toEqual(["[x]"]);
  });
});

describe("queryToJson", () => {
  it("decodes keys and values, treating + as a space", () => {
    expect(toObject("q=hello+world&city=S%C3%A3o%20Paulo&sym=%26%3D")).toEqual({
      q: "hello world",
      city: "São Paulo",
      sym: "&=",
    });
  });

  it("keeps every value a string and gives keys without = an empty value", () => {
    expect(toObject("page=2&debug&empty=")).toEqual({ page: "2", debug: "", empty: "" });
  });

  it("collects repeated keys into an array in order", () => {
    expect(toObject("tag=a&tag=b&tag=c", false)).toEqual({ tag: ["a", "b", "c"] });
    expect(toObject("tag=a&tag=b", true)).toEqual({ tag: ["a", "b"] });
  });

  it("builds nested objects and arrays from bracket keys", () => {
    expect(
      toObject("user[name]=Ada&user[address][city]=London&tags[]=x&tags[]=y&ids[1]=b&ids[0]=a"),
    ).toEqual({
      user: { name: "Ada", address: { city: "London" } },
      tags: ["x", "y"],
      ids: ["a", "b"],
    });
  });

  it("builds arrays of objects from indexed keys", () => {
    expect(toObject("items[0][sku]=A1&items[0][qty]=2&items[1][sku]=B2")).toEqual({
      items: [{ sku: "A1", qty: "2" }, { sku: "B2" }],
    });
  });

  it("leaves bracket keys flat when nesting is off", () => {
    expect(toObject("user[name]=Ada&tags[]=x", false)).toEqual({ "user[name]": "Ada", "tags[]": "x" });
  });

  it("closes gaps in indexed arrays and says so", () => {
    const result = queryToJson("a[0]=x&a[5]=y");
    expect(result.ok && JSON.parse(result.value.output)).toEqual({ a: ["x", "y"] });
    expect(result.ok && result.value.warnings).toHaveLength(1);
  });

  it("skips a parameter that conflicts with an earlier one and warns", () => {
    const result = queryToJson("a=1&a[b]=2&c[d]=3&c=4");
    expect(result.ok && JSON.parse(result.value.output)).toEqual({ a: "1", c: { d: "3" } });
    expect(result.ok && result.value.warnings).toHaveLength(2);
  });

  it("keeps malformed escapes as written and warns", () => {
    const result = queryToJson("q=100%&ok=1");
    expect(result.ok && JSON.parse(result.value.output)).toEqual({ q: "100%", ok: "1" });
    expect(result.ok && result.value.warnings[0]).toMatch(/malformed/);
  });

  it("skips pairs with no name and ignores empty segments", () => {
    const result = queryToJson("&&=orphan&a=1&");
    expect(result.ok && JSON.parse(result.value.output)).toEqual({ a: "1" });
    expect(result.ok && result.value.warnings).toHaveLength(1);
  });

  it("treats __proto__ as an ordinary key", () => {
    const parsed = toObject("__proto__[polluted]=yes&constructor=x") as Record<string, unknown>;
    expect(JSON.stringify(parsed)).toBe('{"__proto__":{"polluted":"yes"},"constructor":"x"}');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("returns empty output for empty input and {} for a URL with no query", () => {
    expect(queryToJson("   ")).toEqual({ ok: true, value: { output: "", warnings: [] } });
    expect(queryToJson("https://example.com/")).toEqual({ ok: true, value: { output: "{}", warnings: [] } });
  });
});

describe("jsonToQuery", () => {
  it("encodes scalar values, writing null as an empty value", () => {
    expect(toQuery({ q: "hello world", page: 2, debug: false, token: null, sym: "a&b=c" })).toBe(
      "q=hello%20world&page=2&debug=false&token=&sym=a%26b%3Dc",
    );
  });

  it("writes arrays as repeated keys or with brackets", () => {
    expect(toQuery({ tag: ["a", "b"] })).toBe("tag=a&tag=b");
    expect(toQuery({ tag: ["a", "b"] }, "brackets")).toBe("tag[]=a&tag[]=b");
  });

  it("uses bracket keys for nested objects and indices for objects inside arrays", () => {
    expect(
      toQuery({ user: { name: "Ada", "first name": "A" }, items: [{ sku: "A1" }, { sku: "B2" }] }),
    ).toBe("user[name]=Ada&user[first%20name]=A&items[0][sku]=A1&items[1][sku]=B2");
  });

  it("leaves out empty arrays and objects with a warning", () => {
    const result = jsonToQuery('{"a":[],"b":{},"c":"1"}');
    expect(result.ok && result.value.output).toBe("c=1");
    expect(result.ok && result.value.warnings).toHaveLength(2);
  });

  it("rejects invalid JSON and non-object roots", () => {
    expect(jsonToQuery("{nope").ok).toBe(false);
    for (const input of ["[1,2]", '"text"', "42", "null"]) {
      const result = jsonToQuery(input);
      expect(result.ok, input).toBe(false);
      expect(!result.ok && result.error).toMatch(/JSON object/);
    }
  });

  it("round-trips string-valued structures through queryToJson", () => {
    const value = {
      q: "100% & more",
      user: { name: "Zoë", roles: ["admin", "dev"] },
      items: [{ sku: "A1", qty: "2" }, { sku: "B2", qty: "1" }],
    };
    for (const format of ["repeat", "brackets"] as const) {
      expect(toObject(toQuery(value, format))).toEqual(value);
    }
  });
});

describe("convertQueryString", () => {
  it("dispatches on direction", () => {
    const toJson = convertQueryString("a=1", "query-to-json");
    expect(toJson.ok && JSON.parse(toJson.value.output)).toEqual({ a: "1" });
    const toQs = convertQueryString('{"a":1}', "json-to-query");
    expect(toQs.ok && toQs.value.output).toBe("a=1");
  });
});
