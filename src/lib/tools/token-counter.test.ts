import { describe, expect, it } from "vitest";
import {
  countTokens,
  countWords,
  estimateTokenCount,
  MODELS,
} from "./token-counter";

describe("countTokens — GPT models (exact)", () => {
  it("returns zero tokens for empty input", async () => {
    expect(await countTokens("", "gpt-4")).toEqual({ tokens: 0, exact: true });
    expect(await countTokens("", "gpt-4o")).toEqual({ tokens: 0, exact: true });
  });

  it("round-trips through the real tiktoken encoder — the strongest available correctness check", async () => {
    // Importing js-tiktoken directly here, independent of the module under
    // test, so this isn't just checking the code against itself.
    const { Tiktoken } = await import("js-tiktoken");
    const cl100k = (await import("js-tiktoken/ranks/cl100k_base")).default;
    const encoder = new Tiktoken(cl100k);

    const samples = [
      "Hello, world!",
      "The quick brown fox jumps over the lazy dog.",
      "function add(a, b) { return a + b; }",
      "supercalifragilisticexpialidocious",
      "こんにちは世界",
    ];
    for (const text of samples) {
      const ids = encoder.encode(text);
      expect(encoder.decode(ids)).toBe(text);
    }
  });

  it("matches the real encoder's own token count exactly, for both GPT encodings", async () => {
    const text = "The quick brown fox jumps over the lazy dog, 42 times!";

    const { Tiktoken } = await import("js-tiktoken");
    const cl100k = (await import("js-tiktoken/ranks/cl100k_base")).default;
    const o200k = (await import("js-tiktoken/ranks/o200k_base")).default;
    const expectedGpt4 = new Tiktoken(cl100k).encode(text).length;
    const expectedGpt4o = new Tiktoken(o200k).encode(text).length;

    expect(await countTokens(text, "gpt-4")).toEqual({ tokens: expectedGpt4, exact: true });
    expect(await countTokens(text, "gpt-4o")).toEqual({ tokens: expectedGpt4o, exact: true });
  });

  it("counts more tokens for longer text than shorter text", async () => {
    const short = (await countTokens("Hi", "gpt-4")).tokens;
    const long = (await countTokens("Hi".repeat(200), "gpt-4")).tokens;
    expect(long).toBeGreaterThan(short);
  });
});

describe("estimateTokenCount / countTokens — Claude and Gemini (estimate)", () => {
  it("is explicitly marked inexact", async () => {
    const claude = await countTokens("Some sample text here.", "claude");
    const gemini = await countTokens("Some sample text here.", "gemini");
    expect(claude.exact).toBe(false);
    expect(gemini.exact).toBe(false);
  });

  it("uses the same ~4-chars-per-token heuristic for both, since neither has a public tokenizer", async () => {
    const text = "x".repeat(40);
    const claude = await countTokens(text, "claude");
    const gemini = await countTokens(text, "gemini");
    expect(claude.tokens).toBe(gemini.tokens);
    expect(claude.tokens).toBe(estimateTokenCount(text));
  });

  it("returns zero for empty input", () => {
    expect(estimateTokenCount("")).toBe(0);
  });
});

describe("countWords", () => {
  it("counts whitespace-separated words", () => {
    expect(countWords("The quick brown fox")).toBe(4);
  });

  it("returns zero for empty or whitespace-only input", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
  });
});

describe("MODELS", () => {
  it("marks exactly the GPT models as exact", () => {
    for (const m of MODELS) {
      expect(m.exact).toBe(m.id === "gpt-4" || m.id === "gpt-4o");
    }
  });
});
