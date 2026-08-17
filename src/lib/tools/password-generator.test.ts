import { describe, expect, it } from "vitest";
import {
  buildCharPool,
  generatePassword,
  passwordEntropyBits,
  strengthLabel,
} from "./password-generator";

const ALL_CLASSES = { lower: true, upper: true, number: true, symbol: true };
const NONE = { lower: false, upper: false, number: false, symbol: false };

describe("buildCharPool", () => {
  it("unions every enabled class", () => {
    const pool = buildCharPool({ classes: { ...NONE, lower: true, number: true }, excludeAmbiguous: false });
    expect(pool).toContain("a");
    expect(pool).toContain("5");
    expect(pool).not.toContain("A");
    expect(pool).not.toContain("!");
  });

  it("is empty when no class is selected", () => {
    expect(buildCharPool({ classes: NONE, excludeAmbiguous: false })).toBe("");
  });

  it("strips ambiguous characters when requested", () => {
    const pool = buildCharPool({ classes: ALL_CLASSES, excludeAmbiguous: true });
    for (const c of ["0", "O", "1", "l", "I"]) {
      expect(pool).not.toContain(c);
    }
    // Unambiguous members of the same classes must survive.
    expect(pool).toContain("a");
    expect(pool).toContain("9");
  });
});

describe("passwordEntropyBits", () => {
  it("matches length times log2(pool size)", () => {
    expect(passwordEntropyBits(16, 26)).toBeCloseTo(16 * Math.log2(26), 6);
  });

  it("is zero for a degenerate pool", () => {
    expect(passwordEntropyBits(16, 1)).toBe(0);
    expect(passwordEntropyBits(16, 0)).toBe(0);
  });
});

describe("strengthLabel", () => {
  it("buckets bits into the documented bands", () => {
    expect(strengthLabel(20)).toBe("Weak");
    expect(strengthLabel(45)).toBe("Fair");
    expect(strengthLabel(65)).toBe("Strong");
    expect(strengthLabel(100)).toBe("Very strong");
  });

  it("treats the band edges as belonging to the stronger side", () => {
    expect(strengthLabel(40)).toBe("Fair");
    expect(strengthLabel(60)).toBe("Strong");
    expect(strengthLabel(80)).toBe("Very strong");
  });
});

describe("generatePassword", () => {
  it("generates a password of the requested length from only enabled classes", () => {
    const result = generatePassword({ length: 20, classes: { ...NONE, lower: true }, excludeAmbiguous: false });
    if (!result.ok) throw new Error(result.error);
    expect(result.value).toHaveLength(20);
    expect(result.value).toMatch(/^[a-z]+$/);
  });

  it("never includes ambiguous characters when excluded", () => {
    const result = generatePassword({ length: 128, classes: ALL_CLASSES, excludeAmbiguous: true });
    if (!result.ok) throw new Error(result.error);
    for (const c of ["0", "O", "1", "l", "I"]) {
      expect(result.value).not.toContain(c);
    }
  });

  it("does not repeat across calls", () => {
    const a = generatePassword({ length: 32, classes: ALL_CLASSES, excludeAmbiguous: false });
    const b = generatePassword({ length: 32, classes: ALL_CLASSES, excludeAmbiguous: false });
    if (!a.ok || !b.ok) throw new Error("generation failed");
    expect(a.value).not.toBe(b.value);
  });

  it("rejects no selected class, and out-of-range lengths", () => {
    expect(generatePassword({ length: 16, classes: NONE, excludeAmbiguous: false }).ok).toBe(false);
    expect(generatePassword({ length: 3, classes: ALL_CLASSES, excludeAmbiguous: false }).ok).toBe(false);
    expect(generatePassword({ length: 129, classes: ALL_CLASSES, excludeAmbiguous: false }).ok).toBe(false);
    expect(generatePassword({ length: 4, classes: ALL_CLASSES, excludeAmbiguous: false }).ok).toBe(true);
    expect(generatePassword({ length: 128, classes: ALL_CLASSES, excludeAmbiguous: false }).ok).toBe(true);
  });
});
