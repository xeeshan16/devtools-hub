import { describe, expect, it } from "vitest";
import {
  DIFF_TOKEN_LIMIT,
  diffStats,
  diffText,
  diffTokens,
  type DiffPart,
} from "./diff";

/** Concatenating the equal+remove parts must exactly reconstruct the original `a`. */
function reconstructA(parts: DiffPart[]): string {
  return parts
    .filter((p) => p.type === "equal" || p.type === "remove")
    .map((p) => p.value)
    .join("");
}

/** Concatenating the equal+add parts must exactly reconstruct the original `b`. */
function reconstructB(parts: DiffPart[]): string {
  return parts
    .filter((p) => p.type === "equal" || p.type === "add")
    .map((p) => p.value)
    .join("");
}

describe("diffTokens", () => {
  it("returns nothing for two empty inputs", () => {
    expect(diffTokens([], [])).toEqual([]);
  });

  it("marks everything as added when a is empty", () => {
    expect(diffTokens([], ["a", "b"])).toEqual([{ type: "add", value: "ab" }]);
  });

  it("marks everything as removed when b is empty", () => {
    expect(diffTokens(["a", "b"], [])).toEqual([{ type: "remove", value: "ab" }]);
  });

  it("returns a single equal run for identical input", () => {
    expect(diffTokens(["a", "b", "c"], ["a", "b", "c"])).toEqual([
      { type: "equal", value: "abc" },
    ]);
  });

  it("finds a single-token substitution in the middle", () => {
    const parts = diffTokens(["a", "b", "c"], ["a", "x", "c"]);
    expect(parts.map((p) => p.type)).toEqual(["equal", "remove", "add", "equal"]);
    expect(reconstructA(parts)).toBe("abc");
    expect(reconstructB(parts)).toBe("axc");
  });

  it("finds a pure insertion", () => {
    const parts = diffTokens(["a", "c"], ["a", "b", "c"]);
    expect(reconstructA(parts)).toBe("ac");
    expect(reconstructB(parts)).toBe("abc");
    expect(parts.some((p) => p.type === "add" && p.value === "b")).toBe(true);
  });

  it("reconstructs both sides exactly across varied random-ish inputs", () => {
    const cases: [string[], string[]][] = [
      [["a", "b", "c", "d"], ["b", "c", "d", "e"]],
      [["1", "2", "3"], ["3", "2", "1"]],
      [["x"], ["x", "x", "x"]],
      [["foo", "bar", "baz", "qux"], ["foo", "qux", "bar"]],
    ];
    for (const [a, b] of cases) {
      const parts = diffTokens(a, b);
      expect(reconstructA(parts)).toBe(a.join(""));
      expect(reconstructB(parts)).toBe(b.join(""));
    }
  });
});

describe("diffText", () => {
  it("diffs line by line, keeping newlines attached to each token", () => {
    const result = diffText("a\nb\nc", "a\nx\nc", "line");
    if (!result.ok) throw new Error(result.error);
    expect(result.value.map((p) => p.type)).toEqual(["equal", "remove", "add", "equal"]);
    expect(result.value.find((p) => p.type === "remove")?.value).toBe("b\n");
    expect(result.value.find((p) => p.type === "add")?.value).toBe("x\n");
  });

  it("diffs word by word, treating whitespace as its own token", () => {
    const result = diffText("the quick fox", "the slow fox", "word");
    if (!result.ok) throw new Error(result.error);
    expect(result.value.find((p) => p.type === "remove")?.value).toBe("quick");
    expect(result.value.find((p) => p.type === "add")?.value).toBe("slow");
  });

  it("rejects input over the token limit", () => {
    const huge = Array.from({ length: DIFF_TOKEN_LIMIT + 1 }, (_, i) => `line ${i}`).join("\n");
    const result = diffText(huge, "", "line");
    expect(result.ok).toBe(false);
  });

  it("accepts input right at the token limit", () => {
    const lines = Array.from({ length: DIFF_TOKEN_LIMIT / 2 }, (_, i) => `line ${i}`).join("\n");
    const result = diffText(lines, lines, "line");
    expect(result.ok).toBe(true);
  });
});

describe("diffStats", () => {
  it("counts added and removed lines, not just diff parts", () => {
    const result = diffText("a\nb\nc", "a\nx\ny\nc", "line");
    if (!result.ok) throw new Error(result.error);
    const stats = diffStats(result.value, "line");
    expect(stats.deletions).toBe(1); // "b"
    expect(stats.additions).toBe(2); // "x", "y"
    expect(stats.unchanged).toBe(2); // "a", "c"
  });

  it("counts every word inside a merged multi-word run, not one per run", () => {
    const parts: DiffPart[] = [
      { type: "equal", value: "the " },
      { type: "remove", value: "quick " },
      { type: "add", value: "very slow " },
      { type: "equal", value: "fox" },
    ];
    const stats = diffStats(parts, "word");
    expect(stats).toEqual({ additions: 2, deletions: 1, unchanged: 2 });
  });

  it("matches a hand-counted real diff across a full sentence", () => {
    const before = "Fast, reliable developer tools.\nBuilt for daily use.\nRuns in your browser.";
    const after =
      "Fast, private developer tools.\nBuilt for daily use.\nRuns entirely in your browser.\nNo sign-up required.";
    const result = diffText(before, after, "word");
    if (!result.ok) throw new Error(result.error);
    const stats = diffStats(result.value, "word");
    // reliable->private (1 removed, 1 added), entirely inserted (1 added),
    // "No sign-up required." appended (3 added).
    expect(stats.deletions).toBe(1);
    expect(stats.additions).toBe(5);
  });
});
