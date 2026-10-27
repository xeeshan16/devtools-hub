import { err, ok, type ToolResult } from "./result";

export type DataUnitKind = "byte" | "bit";

/** 1000 for SI prefixes (kB, MB), 1024 for IEC binary prefixes (KiB, MiB). */
export type PrefixBase = 1000 | 1024;

export type DataUnit = {
  symbol: string;
  name: string;
  kind: DataUnitKind;
  base: PrefixBase;
  /** Prefix exponent: 0 for the bare unit, 1 for kilo/kibi, 2 for mega/mebi… */
  power: number;
  /** Size of one of this unit, in bits. */
  bits: bigint;
};

const PREFIXES = [
  { si: "k", iec: "Ki", siName: "kilo", iecName: "kibi" },
  { si: "M", iec: "Mi", siName: "mega", iecName: "mebi" },
  { si: "G", iec: "Gi", siName: "giga", iecName: "gibi" },
  { si: "T", iec: "Ti", siName: "tera", iecName: "tebi" },
  { si: "P", iec: "Pi", siName: "peta", iecName: "pebi" },
  { si: "E", iec: "Ei", siName: "exa", iecName: "exbi" },
] as const;

function unitsFor(kind: DataUnitKind, base: PrefixBase): DataUnit[] {
  const bitsPerUnit = kind === "byte" ? 8n : 1n;
  const word = kind === "byte" ? "byte" : "bit";
  const suffix = kind === "byte" ? "B" : "bit";
  return PREFIXES.map((prefix, i) => {
    const power = i + 1;
    return {
      symbol: `${base === 1000 ? prefix.si : prefix.iec}${suffix}`,
      name: `${base === 1000 ? prefix.siName : prefix.iecName}${word}`,
      kind,
      base,
      power,
      bits: bitsPerUnit * BigInt(base) ** BigInt(power),
    };
  });
}

export const BYTE: DataUnit = { symbol: "B", name: "byte", kind: "byte", base: 1000, power: 0, bits: 8n };
export const BIT: DataUnit = { symbol: "bit", name: "bit", kind: "bit", base: 1000, power: 0, bits: 1n };

/** Every unit the converter prints, grouped the way the UI shows them. */
export const UNIT_GROUPS: readonly { title: string; units: readonly DataUnit[] }[] = [
  { title: "Decimal bytes (SI, powers of 1000)", units: [BYTE, ...unitsFor("byte", 1000)] },
  { title: "Binary bytes (IEC, powers of 1024)", units: [BYTE, ...unitsFor("byte", 1024)] },
  { title: "Decimal bits (SI, powers of 1000)", units: [BIT, ...unitsFor("bit", 1000)] },
  { title: "Binary bits (IEC, powers of 1024)", units: [BIT, ...unitsFor("bit", 1024)] },
];

const ALL_UNITS: DataUnit[] = [
  BYTE,
  BIT,
  ...unitsFor("byte", 1000),
  ...unitsFor("byte", 1024),
  ...unitsFor("bit", 1000),
  ...unitsFor("bit", 1024),
];

/**
 * An exact, non-negative amount of data as a fraction of bits. Inputs are
 * decimals and every unit is a whole number of bits, so a fraction keeps every
 * conversion exact: 1.1 KiB is 1126.4 bytes, not 1126.3999999.
 */
export type DataSize = {
  numerator: bigint;
  denominator: bigint;
  /** The unit the input was written in. */
  unit: DataUnit;
};

/** Long inputs make BigInt arithmetic slow; no real size needs this many digits. */
export const MAX_DIGITS = 60;
const MAX_EXPONENT = 60;

/**
 * Resolves a unit symbol or name. The case of the final letter decides bytes
 * versus bits, following IEC 80000-13: `MB` is megabytes and `Mb` is megabits.
 * Prefix letters are case-insensitive, so `KB`, `kB` and `kb` all have a prefix
 * of 1000, and an `i` (`KiB`, `MiB`) makes the prefix binary.
 */
export function parseUnit(text: string): DataUnit | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;

  const lower = trimmed.toLowerCase();
  // Names (megabyte, gibibits) and bit symbols (Mbit, Kibit) are unambiguous
  // in any case; only the one-letter B/b symbols depend on it.
  const byName = ALL_UNITS.find(
    (unit) =>
      lower === unit.name ||
      lower === `${unit.name}s` ||
      (unit.kind === "bit" && lower === unit.symbol.toLowerCase()),
  );
  if (byName) return byName;

  const match = /^([kmgtpe])?(i)?(b)$/i.exec(trimmed);
  if (!match) return null;
  const [, prefix, binary, letter] = match;
  const kind: DataUnitKind = letter === "B" ? "byte" : "bit";
  if (!prefix) return binary ? null : kind === "byte" ? BYTE : BIT;

  const base: PrefixBase = binary ? 1024 : 1000;
  const power = PREFIXES.findIndex((p) => p.si.toLowerCase() === prefix.toLowerCase()) + 1;
  return ALL_UNITS.find((u) => u.kind === kind && u.base === base && u.power === power) ?? null;
}

const NUMBER = /^(?:\d[\d_,]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:e[+-]?\d+)?/i;

/**
 * Parses a size such as `1.5 GiB`, `500MB`, `1,048,576`, `100 Mb` or `2e9 B`.
 * A number with no unit is read in `defaultUnit`. Empty input yields null so the
 * UI can show nothing rather than an error.
 */
export function parseDataSize(input: string, defaultUnit: DataUnit = BYTE): ToolResult<DataSize | null> {
  const trimmed = input.trim();
  if (!trimmed) return ok(null);
  if (trimmed.startsWith("-")) return err("A data size can't be negative.");

  const body = trimmed.startsWith("+") ? trimmed.slice(1).trimStart() : trimmed;
  const numberMatch = NUMBER.exec(body);
  if (!numberMatch) return err(`Start with a number, e.g. 1.5 GiB or 500 MB.`);

  const unitText = body.slice(numberMatch[0].length).trim();
  const unit = unitText === "" ? defaultUnit : parseUnit(unitText);
  if (!unit) {
    return err(`"${unitText}" is not a unit this converter knows. Try B, kB, MB, GB, KiB, MiB, GiB, bit, Mb or Gb.`);
  }

  const [mantissaText, exponentText] = numberMatch[0].toLowerCase().split("e");
  const [whole, fraction = ""] = mantissaText.replace(/[_,]/g, "").split(".");
  const digits = (whole + fraction).replace(/^0+(?=\d)/, "");
  if (digits.length > MAX_DIGITS) return err(`That number has more than ${MAX_DIGITS} digits.`);

  const exponent = (exponentText ? Number(exponentText) : 0) - fraction.length;
  if (Math.abs(exponent) > MAX_EXPONENT) return err("That number is too large or too precise to convert.");

  let numerator = BigInt(digits || "0") * unit.bits;
  let denominator = 1n;
  if (exponent >= 0) numerator *= 10n ** BigInt(exponent);
  else denominator = 10n ** BigInt(-exponent);

  return ok(reduce({ numerator, denominator, unit }));
}

function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function reduce(size: DataSize): DataSize {
  const divisor = gcd(size.numerator, size.denominator);
  if (divisor <= 1n) return size;
  return { ...size, numerator: size.numerator / divisor, denominator: size.denominator / divisor };
}

export type FormattedSize = {
  /** Decimal text with thousands separators, e.g. "1,536" or "1.464844". */
  text: string;
  /** False when digits were rounded away. */
  exact: boolean;
};

/** Significant digits kept after the leading zeros of a value below one. */
const SIGNIFICANT_DIGITS = 6;
const MAX_FRACTION_DIGITS = 30;

/**
 * Formats numerator / denominator as a decimal, rounding half up. Values of one
 * or more keep up to `maxFraction` decimal places; smaller values keep six
 * significant digits so 1 byte in GiB reads 0.000000000931323, not 0.
 */
export function formatRatio(numerator: bigint, denominator: bigint, maxFraction = 6): FormattedSize {
  let whole = numerator / denominator;
  const remainder = numerator % denominator;

  let places = maxFraction;
  if (whole === 0n && remainder !== 0n) {
    let leadingZeros = 0;
    while (remainder * 10n ** BigInt(leadingZeros + 1) < denominator) leadingZeros++;
    places = Math.min(MAX_FRACTION_DIGITS, Math.max(maxFraction, leadingZeros + SIGNIFICANT_DIGITS));
  }

  const scale = 10n ** BigInt(places);
  const scaled = remainder * scale;
  let fraction = scaled / denominator;
  const lost = scaled % denominator;
  if (lost * 2n >= denominator) fraction += 1n;
  if (fraction === scale) {
    whole += 1n;
    fraction = 0n;
  }

  const fractionText = places > 0 ? fraction.toString().padStart(places, "0").replace(/0+$/, "") : "";
  const wholeText = whole.toLocaleString("en-US");
  return {
    text: fractionText ? `${wholeText}.${fractionText}` : wholeText,
    exact: lost === 0n,
  };
}

/** The size expressed in `unit`. */
export function convertDataSize(size: DataSize, unit: DataUnit, maxFraction = 6): FormattedSize {
  return formatRatio(size.numerator, size.denominator * unit.bits, maxFraction);
}

/**
 * The size in the largest byte unit of `base` that keeps the value at one or
 * more, with up to two decimals: what `ls -h` (1024) or a file manager (1000)
 * would print.
 */
export function humanizeDataSize(size: DataSize, base: PrefixBase): string {
  const group = UNIT_GROUPS.find((g) => g.units[1].kind === "byte" && g.units[1].base === base)!;
  let best = group.units[0];
  for (const unit of group.units) {
    if (size.numerator >= size.denominator * unit.bits) best = unit;
  }
  const value = convertDataSize(size, best, 2);
  return `${value.exact ? "" : "≈ "}${value.text} ${best.symbol}`;
}
