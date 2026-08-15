import { describe, expect, it } from "vitest";
import { convert, jsonToYaml, yamlToJson } from "./yaml-json";

describe("yamlToJson", () => {
  it("converts nested mappings and sequences", () => {
    const result = yamlToJson("name: web\nports:\n  - 80\n  - 443\n");
    if (!result.ok) throw new Error(result.error);
    expect(JSON.parse(result.value)).toEqual({ name: "web", ports: [80, 443] });
  });

  it("preserves key order", () => {
    const result = yamlToJson("b: 1\na: 2\nc: 3\n");
    if (!result.ok) throw new Error(result.error);
    expect(Object.keys(JSON.parse(result.value))).toEqual(["b", "a", "c"]);
  });

  it("keeps newlines from a literal block scalar", () => {
    const result = yamlToJson("script: |\n  npm ci\n  npm test\n");
    if (!result.ok) throw new Error(result.error);
    expect(JSON.parse(result.value).script).toBe("npm ci\nnpm test\n");
  });

  it("treats blank input as empty output", () => {
    expect(yamlToJson("   \n")).toEqual({ ok: true, value: "" });
  });

  it("reports a parse error for malformed YAML", () => {
    const result = yamlToJson("a:\n  - 1\n b: 2\n");
    expect(result.ok).toBe(false);
  });
});

describe("jsonToYaml", () => {
  it("emits block style with two-space indentation", () => {
    const result = jsonToYaml('{"on":{"push":{"branches":["main"]}}}');
    if (!result.ok) throw new Error(result.error);
    expect(result.value).toContain("push:");
    expect(result.value).toContain("- main");
  });

  it("round-trips back to the same data", () => {
    const original = { a: 1, b: [true, null, "x"], c: { d: "e" } };
    const yaml = jsonToYaml(JSON.stringify(original));
    if (!yaml.ok) throw new Error(yaml.error);
    const back = yamlToJson(yaml.value);
    if (!back.ok) throw new Error(back.error);
    expect(JSON.parse(back.value)).toEqual(original);
  });

  it("expands repeated objects instead of writing anchors", () => {
    const shared = { host: "db" };
    const result = jsonToYaml(
      JSON.stringify({ primary: shared, replica: shared }),
    );
    if (!result.ok) throw new Error(result.error);
    expect(result.value).not.toMatch(/[&*]ref/);
    expect(result.value.match(/host: db/g)).toHaveLength(2);
  });

  it("rejects invalid JSON", () => {
    expect(jsonToYaml('{"a":1,}').ok).toBe(false);
  });

  it("treats blank input as empty output", () => {
    expect(jsonToYaml("  ")).toEqual({ ok: true, value: "" });
  });
});

describe("convert", () => {
  it("dispatches on direction", () => {
    expect(convert("a: 1", "yaml-to-json")).toEqual(
      expect.objectContaining({ ok: true }),
    );
    expect(convert('{"a":1}', "json-to-yaml")).toEqual(
      expect.objectContaining({ ok: true }),
    );
  });
});
