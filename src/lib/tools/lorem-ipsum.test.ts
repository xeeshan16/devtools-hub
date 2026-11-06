import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOREM_OPTIONS,
  generateLorem,
  LOREM_MAX_COUNT,
  type LoremOptions,
  type RandomSource,
} from "./lorem-ipsum";

function opts(overrides: Partial<LoremOptions>): LoremOptions {
  return { ...DEFAULT_LOREM_OPTIONS, ...overrides };
}

/** Deterministic linear congruential generator so tests are repeatable. */
function seeded(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function value(options: LoremOptions, seed = 1): string {
  const result = generateLorem(options, seeded(seed));
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

const OPENING = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

describe("generateLorem", () => {
  it("returns exactly the requested number of words", () => {
    for (const count of [1, 3, 8, 9, 250]) {
      const text = value(opts({ unit: "words", count }));
      expect(text.split(" "), String(count)).toHaveLength(count);
    }
  });

  it("starts word output with the classic opening, without punctuation", () => {
    expect(value(opts({ unit: "words", count: 5 }))).toBe("Lorem ipsum dolor sit amet");
  });

  it("truncates the classic opening when fewer words are requested", () => {
    expect(value(opts({ unit: "words", count: 2 }))).toBe("Lorem ipsum");
  });

  it("returns random words, capitalised, when the classic opening is off", () => {
    const text = value(opts({ unit: "words", count: 6, startWithLorem: false }));
    expect(text.split(" ")).toHaveLength(6);
    expect(text).not.toMatch(/^Lorem ipsum dolor/);
    expect(text).toMatch(/^[A-Z][a-z]*( [a-z]+){5}$/);
  });

  it("returns the requested number of sentences, each capitalised and full-stopped", () => {
    const text = value(opts({ unit: "sentences", count: 12 }));
    const parts = text.split(/(?<=\.) /);
    expect(parts).toHaveLength(12);
    for (const part of parts) {
      expect(part).toMatch(/^[A-Z][a-z]*(,? [a-z]+)+\.$/);
    }
  });

  it("opens sentence output with the classic sentence", () => {
    expect(value(opts({ unit: "sentences", count: 2 }))).toMatch(new RegExp(`^${OPENING} [A-Z]`));
  });

  it("keeps a generated sentence between 6 and 14 words", () => {
    const text = value(opts({ unit: "sentences", count: 200, startWithLorem: false }), 7);
    for (const part of text.split(/(?<=\.) /)) {
      const length = part.split(" ").length;
      expect(length).toBeGreaterThanOrEqual(6);
      expect(length).toBeLessThanOrEqual(14);
    }
  });

  it("separates paragraphs with a blank line and starts only the first with the opening", () => {
    const paragraphs = value(opts({ unit: "paragraphs", count: 4 })).split("\n\n");
    expect(paragraphs).toHaveLength(4);
    expect(paragraphs[0].startsWith(OPENING)).toBe(true);
    for (const paragraph of paragraphs.slice(1)) {
      expect(paragraph.startsWith(OPENING)).toBe(false);
    }
    for (const paragraph of paragraphs) {
      const sentenceCount = paragraph.split(/(?<=\.) /).length;
      expect(sentenceCount).toBeGreaterThanOrEqual(4);
      expect(sentenceCount).toBeLessThanOrEqual(7);
    }
  });

  it("is deterministic for a given random source", () => {
    const options = opts({ unit: "paragraphs", count: 3, startWithLorem: false });
    expect(value(options, 42)).toBe(value(options, 42));
    expect(value(options, 42)).not.toBe(value(options, 43));
  });

  it("rejects counts below 1 and non-integers", () => {
    for (const count of [0, -3, 1.5, Number.NaN]) {
      const result = generateLorem(opts({ unit: "sentences", count }));
      expect(result.ok, String(count)).toBe(false);
    }
  });

  it("rejects counts above the per-unit limit and accepts the limit itself", () => {
    for (const unit of ["paragraphs", "sentences", "words"] as const) {
      const max = LOREM_MAX_COUNT[unit];
      expect(generateLorem(opts({ unit, count: max })).ok, unit).toBe(true);
      const over = generateLorem(opts({ unit, count: max + 1 }));
      expect(over.ok, unit).toBe(false);
      if (!over.ok) expect(over.error).toContain(max.toLocaleString("en-US"));
    }
  });
});
