import { describe, expect, it } from "vitest";
import {
  BIT,
  BYTE,
  UNIT_GROUPS,
  convertDataSize,
  formatRatio,
  humanizeDataSize,
  parseDataSize,
  parseUnit,
  type DataSize,
  type DataUnit,
} from "./data-size";

function unit(symbol: string): DataUnit {
  const found = parseUnit(symbol);
  if (!found) throw new Error(`no unit ${symbol}`);
  return found;
}

function size(input: string, defaultUnit?: DataUnit): DataSize {
  const result = parseDataSize(input, defaultUnit);
  if (!result.ok) throw new Error(result.error);
  if (!result.value) throw new Error("empty");
  return result.value;
}

function to(input: string, symbol: string): string {
  return convertDataSize(size(input), unit(symbol)).text;
}

function error(input: string): string {
  const result = parseDataSize(input);
  if (result.ok) throw new Error(`expected an error for ${input}`);
  return result.error;
}

describe("parseUnit", () => {
  it("reads B as bytes and b as bits", () => {
    expect(parseUnit("B")).toBe(BYTE);
    expect(parseUnit("b")).toBe(BIT);
    expect(parseUnit("MB")?.name).toBe("megabyte");
    expect(parseUnit("Mb")?.name).toBe("megabit");
  });

  it("treats prefix letters case-insensitively", () => {
    expect(parseUnit("kB")?.symbol).toBe("kB");
    expect(parseUnit("KB")?.symbol).toBe("kB");
    expect(parseUnit("gB")?.symbol).toBe("GB");
    expect(parseUnit("kb")?.symbol).toBe("kbit");
  });

  it("makes the prefix binary when it carries an i", () => {
    expect(parseUnit("KiB")?.bits).toBe(8n * 1024n);
    expect(parseUnit("GiB")?.bits).toBe(8n * 1024n ** 3n);
    expect(parseUnit("Mib")?.symbol).toBe("Mibit");
  });

  it("accepts unit names, plural names and bit symbols", () => {
    expect(parseUnit("bytes")).toBe(BYTE);
    expect(parseUnit("bits")).toBe(BIT);
    expect(parseUnit("Gigabytes")?.symbol).toBe("GB");
    expect(parseUnit("mebibyte")?.symbol).toBe("MiB");
    expect(parseUnit("Mbit")?.symbol).toBe("Mbit");
    expect(parseUnit("kibibits")?.symbol).toBe("Kibit");
  });

  it("rejects unknown units", () => {
    expect(parseUnit("")).toBeNull();
    expect(parseUnit("iB")).toBeNull();
    expect(parseUnit("XB")).toBeNull();
    expect(parseUnit("meters")).toBeNull();
  });
});

describe("parseDataSize", () => {
  it("returns null for empty input", () => {
    expect(parseDataSize("   ")).toEqual({ ok: true, value: null });
  });

  it("reads a bare number in the default unit", () => {
    expect(size("1024").numerator).toBe(8192n);
    expect(to("1024", "KiB")).toBe("1");
    expect(convertDataSize(size("8", BIT), BYTE).text).toBe("1");
  });

  it("accepts a unit with or without a space", () => {
    expect(to("1.5GiB", "MiB")).toBe("1,536");
    expect(to("1.5 GiB", "MiB")).toBe("1,536");
    expect(to("+2 kB", "B")).toBe("2,000");
  });

  it("accepts thousands separators, underscores and exponents", () => {
    expect(to("1,048,576", "MiB")).toBe("1");
    expect(to("1_000_000 B", "MB")).toBe("1");
    expect(to("2e9 B", "GB")).toBe("2");
    expect(to("1e-3 MB", "kB")).toBe("1");
    expect(to(".5 KiB", "B")).toBe("512");
  });

  it("remembers the unit the input was written in", () => {
    expect(size("3 TB").unit.symbol).toBe("TB");
    expect(size("3").unit).toBe(BYTE);
  });

  it("explains invalid input", () => {
    expect(error("-5 MB")).toMatch(/negative/);
    expect(error("MB")).toMatch(/Start with a number/);
    expect(error("5 meters")).toMatch(/"meters" is not a unit/);
    expect(error("1.2.3 MB")).toMatch(/is not a unit/);
    expect(error("9".repeat(61))).toMatch(/more than 60 digits/);
    expect(error("1e99 B")).toMatch(/too large/);
  });
});

describe("conversions", () => {
  it("keeps decimal and binary prefixes apart", () => {
    expect(to("1 GB", "MB")).toBe("1,000");
    expect(to("1 GiB", "MiB")).toBe("1,024");
    expect(to("1 GiB", "B")).toBe("1,073,741,824");
    expect(to("1 GB", "B")).toBe("1,000,000,000");
  });

  it("converts between bits and bytes", () => {
    expect(to("100 Mb", "MB")).toBe("12.5");
    expect(to("1 B", "bit")).toBe("8");
    expect(to("1 Gbit", "MiB")).toBe("119.20929");
  });

  it("is exact where floating point would drift", () => {
    expect(to("1.1 KiB", "B")).toBe("1,126.4");
    expect(to("0.1 kB", "B")).toBe("100");
    expect(convertDataSize(size("0.3 MB"), unit("kB")).exact).toBe(true);
  });

  it("flags rounded results", () => {
    const value = convertDataSize(size("500 GB"), unit("GiB"));
    expect(value.text).toBe("465.661287");
    expect(value.exact).toBe(false);
  });

  it("keeps significant digits for values far below one", () => {
    expect(to("1 B", "GiB")).toBe("0.000000000931323");
    expect(to("1 bit", "EB")).toBe("0.000000000000000000125");
  });

  it("handles exabyte-scale values exactly", () => {
    expect(to("16 EiB", "B")).toBe("18,446,744,073,709,551,616");
  });

  it("converts zero", () => {
    expect(convertDataSize(size("0 GB"), BYTE)).toEqual({ text: "0", exact: true });
  });
});

describe("formatRatio", () => {
  it("rounds half up and carries into the whole part", () => {
    expect(formatRatio(5n, 2n, 0).text).toBe("3");
    expect(formatRatio(19999995n, 10000000n, 6).text).toBe("2");
    expect(formatRatio(1n, 3n, 2)).toEqual({ text: "0.333333", exact: false });
  });
});

describe("humanizeDataSize", () => {
  it("picks the largest unit that keeps the value at one or more", () => {
    expect(humanizeDataSize(size("1536 MiB"), 1024)).toBe("1.5 GiB");
    expect(humanizeDataSize(size("1536 MiB"), 1000)).toBe("≈ 1.61 GB");
    expect(humanizeDataSize(size("999 B"), 1000)).toBe("999 B");
    expect(humanizeDataSize(size("1000 B"), 1024)).toBe("1,000 B");
    expect(humanizeDataSize(size("4 bit"), 1000)).toBe("0.5 B");
  });
});

describe("UNIT_GROUPS", () => {
  it("lists every prefix once per group, starting with the bare unit", () => {
    for (const group of UNIT_GROUPS) {
      expect(group.units.map((u) => u.power)).toEqual([0, 1, 2, 3, 4, 5, 6]);
      expect(new Set(group.units.map((u) => u.symbol)).size).toBe(group.units.length);
    }
  });

  it("round-trips every symbol through parseUnit", () => {
    for (const group of UNIT_GROUPS) {
      for (const u of group.units) expect(parseUnit(u.symbol)).toEqual(u);
    }
  });
});
