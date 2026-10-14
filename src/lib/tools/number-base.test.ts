import { describe, expect, it } from "vitest";
import {
  MAX_DIGITS,
  convertBase,
  formatInteger,
  integerWidth,
  parseInteger,
} from "./number-base";
import type { ToolResult } from "./result";

function value<T>(result: ToolResult<T>): T {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.value;
}

function error<T>(result: ToolResult<T>): string {
  if (result.ok) throw new Error("expected an error");
  return result.error;
}

describe("parseInteger", () => {
  it("parses each base", () => {
    expect(value(parseInteger("11111111", 2))).toBe(255n);
    expect(value(parseInteger("377", 8))).toBe(255n);
    expect(value(parseInteger("255", 10))).toBe(255n);
    expect(value(parseInteger("ff", 16))).toBe(255n);
    expect(value(parseInteger("FF", 16))).toBe(255n);
  });

  it("accepts the base's own prefix in either case", () => {
    expect(value(parseInteger("0b1010", 2))).toBe(10n);
    expect(value(parseInteger("0O17", 8))).toBe(15n);
    expect(value(parseInteger("0xDEAD_BEEF", 16))).toBe(0xdeadbeefn);
  });

  it("reads a leading 0b in hex as hex digits, not a binary prefix", () => {
    expect(value(parseInteger("0b1", 16))).toBe(0xb1n);
  });

  it("ignores _ and space separators, and commas in decimal", () => {
    expect(value(parseInteger("1111 0000", 2))).toBe(240n);
    expect(value(parseInteger("1_000_000", 10))).toBe(1_000_000n);
    expect(value(parseInteger("1,000,000", 10))).toBe(1_000_000n);
  });

  it("rejects commas outside decimal", () => {
    expect(error(parseInteger("ff,ff", 16))).toMatch(/"," at position 3 is not a hexadecimal digit/);
  });

  it("handles signs", () => {
    expect(value(parseInteger("-0x10", 16))).toBe(-16n);
    expect(value(parseInteger("+42", 10))).toBe(42n);
  });

  it("goes beyond Number.MAX_SAFE_INTEGER without losing precision", () => {
    expect(value(parseInteger("0xffffffffffffffff", 16))).toBe(18446744073709551615n);
  });

  it("returns null for blank input", () => {
    expect(parseInteger("  \n", 10)).toEqual({ ok: true, value: null });
  });

  it("points at the first invalid digit", () => {
    expect(error(parseInteger("10120", 2))).toMatch(/"2" at position 4 is not a binary digit/);
    expect(error(parseInteger("12g4", 16))).toMatch(/"g" at position 3 is not a hexadecimal digit/);
  });

  it("suggests the right base when the input carries another base's prefix", () => {
    expect(error(parseInteger("0x1F", 10))).toMatch(/0x prefix suggests hexadecimal/);
    expect(error(parseInteger("0b101", 10))).toMatch(/0b prefix suggests binary/);
    expect(error(parseInteger("0o17", 16))).toMatch(/0o prefix suggests octal/);
  });

  it("requires at least one digit", () => {
    expect(error(parseInteger("-", 10))).toMatch(/at least one decimal digit/);
    expect(error(parseInteger("0x", 16))).toMatch(/at least one hexadecimal digit/);
  });

  it("caps the number of digits", () => {
    expect(value(parseInteger("1".repeat(MAX_DIGITS), 10))).toBeTypeOf("bigint");
    expect(error(parseInteger("1".repeat(MAX_DIGITS + 1), 10))).toMatch(/limit is 10,000/);
  });
});

describe("formatInteger", () => {
  it("prints lowercase hex by default and uppercase on request", () => {
    expect(formatInteger(48879n, 16)).toBe("beef");
    expect(formatInteger(48879n, 16, { uppercase: true })).toBe("BEEF");
  });

  it("only uppercases hex", () => {
    expect(formatInteger(10n, 10, { uppercase: true })).toBe("10");
  });

  it("groups digits from the least-significant end", () => {
    expect(formatInteger(31n, 2, { grouped: true })).toBe("1_1111");
    expect(formatInteger(1234567n, 10, { grouped: true })).toBe("1_234_567");
    expect(formatInteger(0xdeadbeefn, 16, { grouped: true })).toBe("dead_beef");
    expect(formatInteger(511n, 8, { grouped: true })).toBe("777");
  });

  it("keeps the sign outside the groups", () => {
    expect(formatInteger(-4096n, 16, { grouped: true })).toBe("-1000");
    expect(formatInteger(-65536n, 16, { grouped: true })).toBe("-1_0000");
  });

  it("prints zero", () => {
    expect(formatInteger(0n, 2, { grouped: true })).toBe("0");
  });
});

describe("convertBase", () => {
  it("renders every base from one input", () => {
    expect(value(convertBase("255", 10))).toEqual({ 2: "11111111", 8: "377", 10: "255", 16: "ff" });
  });

  it("round-trips its own grouped output", () => {
    const out = value(convertBase("0xCAFE_F00D", 16, { grouped: true }))!;
    expect(value(convertBase(out[2], 2))![16]).toBe("cafef00d");
    expect(value(convertBase(out[10], 10))![16]).toBe("cafef00d");
  });

  it("passes parse errors through and blank input as null", () => {
    expect(convertBase("12", 2).ok).toBe(false);
    expect(convertBase("", 2)).toEqual({ ok: true, value: null });
  });
});

describe("integerWidth", () => {
  it("counts the bits of the magnitude", () => {
    expect(integerWidth(0n).bits).toBe(1);
    expect(integerWidth(255n).bits).toBe(8);
    expect(integerWidth(256n).bits).toBe(9);
    expect(integerWidth(-255n).bits).toBe(8);
  });

  it("finds the smallest unsigned and signed widths at the boundaries", () => {
    expect(integerWidth(127n)).toEqual({ bits: 7, unsigned: 8, signed: 8 });
    expect(integerWidth(128n)).toEqual({ bits: 8, unsigned: 8, signed: 16 });
    expect(integerWidth(-128n)).toEqual({ bits: 8, unsigned: null, signed: 8 });
    expect(integerWidth(-129n)).toEqual({ bits: 8, unsigned: null, signed: 16 });
    expect(integerWidth(2n ** 64n - 1n)).toMatchObject({ unsigned: 64, signed: 128 });
  });

  it("reports values wider than 128 bits as not fitting", () => {
    expect(integerWidth(2n ** 128n)).toEqual({ bits: 129, unsigned: null, signed: null });
  });
});
