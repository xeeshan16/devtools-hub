import { describe, expect, it } from "vitest";
import { jsonToTs, type JsonToTsOptions } from "./json-to-ts";

function value<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function ts(input: unknown, options?: Partial<JsonToTsOptions>): string {
  return value(
    jsonToTs(JSON.stringify(input), {
      rootName: "Root",
      declaration: "interface",
      ...options,
    }),
  );
}

describe("jsonToTs", () => {
  it("returns nothing for blank input", () => {
    expect(jsonToTs("  \n")).toEqual({ ok: true, value: "" });
  });

  it("types a flat object", () => {
    expect(ts({ id: 1, name: "Ada", admin: false, manager: null })).toBe(
      `export interface Root {
  id: number;
  name: string;
  admin: boolean;
  manager: null;
}`,
    );
  });

  it("declares nested objects as named types after their parent", () => {
    expect(ts({ user: { id: 1, address: { city: "London" } } })).toBe(
      `export interface Root {
  user: User;
}

export interface User {
  id: number;
  address: Address;
}

export interface Address {
  city: string;
}`,
    );
  });

  it("merges array elements, marking keys missing from some as optional", () => {
    expect(
      ts({
        users: [
          { id: 1, name: "Ada" },
          { id: 2, email: "grace@example.com" },
        ],
      }),
    ).toBe(
      `export interface Root {
  users: User[];
}

export interface User {
  id: number;
  name?: string;
  email?: string;
}`,
    );
  });

  it("unions the types seen for one key", () => {
    expect(ts({ items: [{ v: 1 }, { v: "x" }, { v: null }] })).toContain(
      "  v: string | number | null;",
    );
  });

  it("parenthesizes union element types in arrays", () => {
    expect(ts({ mixed: [1, "a", null] })).toContain("  mixed: (string | number | null)[];");
  });

  it("types empty arrays and objects as unknown", () => {
    expect(ts({ tags: [], meta: {} })).toBe(
      `export interface Root {
  tags: unknown[];
  meta: Record<string, unknown>;
}`,
    );
  });

  it("handles nested arrays", () => {
    expect(ts({ grid: [[1, 2], [3]] })).toContain("  grid: number[][];");
  });

  it("quotes keys that are not valid identifiers", () => {
    expect(ts({ "content-type": "json", "2fa": true, $ref: "#" })).toBe(
      `export interface Root {
  "content-type": string;
  "2fa": boolean;
  $ref: string;
}`,
    );
  });

  it("names types from keys in PascalCase and singularizes array items", () => {
    const out = ts({
      shipping_address: { line1: "1 Main St" },
      categories: [{ id: 1 }],
      status: [{ code: "ok" }],
    });
    expect(out).toContain("export interface ShippingAddress {");
    expect(out).toContain("categories: Category[];");
    expect(out).toContain("status: Status[];");
  });

  it("keeps type names unique", () => {
    const out = ts({ a: { item: { x: 1 } }, b: { item: { y: 2 } } });
    expect(out).toContain("item: Item;");
    expect(out).toContain("item: Item2;");
    expect(out).toContain("export interface Item2 {\n  y: number;\n}");
  });

  it("does not shadow built-in global types", () => {
    expect(ts({ date: { iso: "2026-01-01" } })).toContain("date: DateType;");
  });

  it("names a top-level array's elements after the root", () => {
    expect(ts([{ id: 1 }, { id: 2, tag: "x" }], { rootName: "Orders" })).toBe(
      `export type Orders = OrdersItem[];

export interface OrdersItem {
  id: number;
  tag?: string;
}`,
    );
  });

  it("supports primitive roots", () => {
    expect(ts("hello")).toBe("export type Root = string;");
  });

  it("can emit type aliases instead of interfaces", () => {
    expect(ts({ a: { b: 1 } }, { declaration: "type" })).toBe(
      `export type Root = {
  a: A;
};

export type A = {
  b: number;
};`,
    );
  });

  it("sanitizes the root name and falls back to Root", () => {
    expect(ts({ a: 1 }, { rootName: "api response" })).toMatch(/^export interface ApiResponse /);
    expect(ts({ a: 1 }, { rootName: "  " })).toMatch(/^export interface Root /);
    expect(ts({ a: 1 }, { rootName: "1st" })).toMatch(/^export interface Root1st /);
  });

  it("reports invalid JSON with a line and column", () => {
    const result = jsonToTs('{\n  "a": 1,\n}');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/line 3, column 1/);
  });
});
