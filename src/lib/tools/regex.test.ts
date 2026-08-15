import { describe, expect, it } from "vitest";
import { buildRegex, runRegex } from "./regex";

describe("buildRegex", () => {
  it("rejects an empty pattern", () => {
    expect(buildRegex("", "g").ok).toBe(false);
  });

  it("surfaces the engine's own error message", () => {
    const result = buildRegex("(unclosed", "");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/group/i);
  });
});

describe("runRegex", () => {
  it("finds every match with the g flag", () => {
    const result = runRegex("\\d+", "g", "a1 b22 c333");
    if (!result.ok) throw new Error(result.error);
    expect(result.value.matches.map((m) => m.value)).toEqual(["1", "22", "333"]);
  });

  it("stops at the first match without the g flag", () => {
    const result = runRegex("\\d+", "", "a1 b22 c333");
    if (!result.ok) throw new Error(result.error);
    expect(result.value.matches).toHaveLength(1);
    expect(result.value.matches[0].value).toBe("1");
  });

  it("reports numbered and named capture groups", () => {
    const result = runRegex("(?<user>\\w+)@(?<host>\\w+)", "g", "ada@example");
    if (!result.ok) throw new Error(result.error);
    const groups = result.value.matches[0].groups;
    expect(groups).toContainEqual({ name: "user", value: "ada" });
    expect(groups).toContainEqual({ name: "host", value: "example" });
    // Positional entries are emitted alongside the named ones.
    expect(groups).toContainEqual({ name: "1", value: "ada" });
  });

  it("splits the input into alternating matched and unmatched segments", () => {
    const result = runRegex("b", "g", "abc");
    if (!result.ok) throw new Error(result.error);
    expect(result.value.segments).toEqual([
      { text: "a", matched: false },
      { text: "b", matched: true },
      { text: "c", matched: false },
    ]);
  });

  it("terminates on a zero-length match instead of looping forever", () => {
    const result = runRegex("a*", "g", "bbb");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.matches.length).toBeLessThan(10);
  });

  it("caps runaway match counts", () => {
    const result = runRegex("a", "g", "a".repeat(6000));
    if (!result.ok) throw new Error(result.error);
    expect(result.value.matches.length).toBeLessThanOrEqual(5000);
  });

  it("applies a replacement when one is supplied", () => {
    const result = runRegex(
      "(?<user>\\w+)@(?<host>\\w+)",
      "g",
      "ada@example",
      "$<user> at $<host>",
    );
    if (!result.ok) throw new Error(result.error);
    expect(result.value.replaced).toBe("ada at example");
  });

  it("omits the replaced field when no replacement is requested", () => {
    const result = runRegex("a", "g", "abc");
    if (!result.ok) throw new Error(result.error);
    expect(result.value.replaced).toBeUndefined();
  });

  it("honours the m flag for line anchors", () => {
    const single = runRegex("^b", "g", "a\nb");
    const multi = runRegex("^b", "gm", "a\nb");
    if (!single.ok || !multi.ok) throw new Error("expected both to build");
    expect(single.value.matches).toHaveLength(0);
    expect(multi.value.matches).toHaveLength(1);
  });
});
