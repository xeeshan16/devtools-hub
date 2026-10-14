import { err, ok, type ToolResult } from "./result";

export type Radix = 2 | 8 | 10 | 16;

export const RADIXES: readonly { radix: Radix; name: string; prefix: string; groupSize: number }[] = [
  { radix: 2, name: "Binary", prefix: "0b", groupSize: 4 },
  { radix: 8, name: "Octal", prefix: "0o", groupSize: 3 },
  { radix: 10, name: "Decimal", prefix: "", groupSize: 3 },
  { radix: 16, name: "Hexadecimal", prefix: "0x", groupSize: 4 },
];

const RADIX_INFO = Object.fromEntries(RADIXES.map((r) => [r.radix, r])) as Record<
  Radix,
  (typeof RADIXES)[number]
>;

/**
 * BigInt parsing and printing are super-linear in the number of digits, so an
 * accidental paste of a huge file would freeze the tab. Ten thousand digits is
 * far beyond any real integer type and still converts instantly.
 */
export const MAX_DIGITS = 10_000;

export type Conversions = Record<Radix, string>;

export type IntegerWidth = {
  /** Bits needed for the magnitude, excluding any sign. Zero needs one bit. */
  bits: number;
  /** Smallest standard unsigned width (8–128) that holds the value, or null. */
  unsigned: number | null;
  /** Smallest standard two's-complement signed width (8–128) that holds it, or null. */
  signed: number | null;
};

export type FormatOptions = {
  /** Hex letters A–F in uppercase. Ignored for other bases. */
  uppercase?: boolean;
  /** Separate digit groups with `_` (nibbles in binary and hex, thousands in decimal). */
  grouped?: boolean;
};

/**
 * Parses an integer written in `radix`. Accepts a leading sign, the radix's own
 * prefix (`0b`, `0o`, `0x`) and `_` or spaces as digit separators — the forms
 * developers paste from code and logs. Decimal also accepts `,` separators.
 * Blank input parses to `null` so the UI can show placeholders.
 */
export function parseInteger(input: string, radix: Radix): ToolResult<bigint | null> {
  const trimmed = input.trim();
  if (!trimmed) return ok(null);

  let index = 0;
  let negative = false;
  if (trimmed[0] === "-" || trimmed[0] === "+") {
    negative = trimmed[0] === "-";
    index = 1;
  }

  const { prefix, name } = RADIX_INFO[radix];
  if (prefix && trimmed.slice(index, index + 2).toLowerCase() === prefix) index += 2;

  let digits = "";
  for (let i = index; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === "_" || ch === " " || (radix === 10 && ch === ",")) continue;
    const value = Number.parseInt(ch, 36);
    if (Number.isNaN(value) || value >= radix) {
      return err(
        `"${ch}" at position ${i + 1} is not a ${name.toLowerCase()} digit.${otherBaseHint(trimmed.slice(index), radix)}`,
      );
    }
    digits += ch;
  }

  if (!digits) return err(`Enter at least one ${name.toLowerCase()} digit.`);
  if (digits.length > MAX_DIGITS) {
    return err(`That is ${digits.length.toLocaleString("en-US")} digits; the limit is ${MAX_DIGITS.toLocaleString("en-US")}.`);
  }

  const magnitude = BigInt(radix === 10 ? digits : `${prefix}${digits}`);
  return ok(negative ? -magnitude : magnitude);
}

/** Suggests the base a prefixed literal was probably meant for. */
function otherBaseHint(body: string, radix: Radix): string {
  const lower = body.toLowerCase();
  for (const other of RADIXES) {
    if (other.radix !== radix && other.prefix && lower.startsWith(other.prefix)) {
      return ` The ${other.prefix} prefix suggests ${other.name.toLowerCase()}: switch the input base.`;
    }
  }
  return "";
}

export function formatInteger(value: bigint, radix: Radix, options: FormatOptions = {}): string {
  const negative = value < 0n;
  let digits = (negative ? -value : value).toString(radix);
  if (radix === 16 && options.uppercase) digits = digits.toUpperCase();
  if (options.grouped) digits = group(digits, RADIX_INFO[radix].groupSize);
  return negative ? `-${digits}` : digits;
}

/** Groups from the least-significant end, so `11111` becomes `1_1111`. */
function group(digits: string, size: number): string {
  const parts: string[] = [];
  for (let end = digits.length; end > 0; end -= size) {
    parts.unshift(digits.slice(Math.max(0, end - size), end));
  }
  return parts.join("_");
}

/** Parses `input` in base `from` and renders it in all four bases. */
export function convertBase(
  input: string,
  from: Radix,
  options: FormatOptions = {},
): ToolResult<Conversions | null> {
  const parsed = parseInteger(input, from);
  if (!parsed.ok) return parsed;
  if (parsed.value === null) return ok(null);
  const value = parsed.value;
  return ok({
    2: formatInteger(value, 2, options),
    8: formatInteger(value, 8, options),
    10: formatInteger(value, 10, options),
    16: formatInteger(value, 16, options),
  });
}

const STANDARD_WIDTHS = [8, 16, 32, 64, 128] as const;

export function integerWidth(value: bigint): IntegerWidth {
  const magnitude = value < 0n ? -value : value;
  const bits = magnitude === 0n ? 1 : magnitude.toString(2).length;

  const unsigned =
    value < 0n ? null : (STANDARD_WIDTHS.find((w) => magnitude < 1n << BigInt(w)) ?? null);
  // Signed n-bit range is [-2^(n-1), 2^(n-1) - 1].
  const signed =
    STANDARD_WIDTHS.find((w) => {
      const limit = 1n << BigInt(w - 1);
      return value < 0n ? magnitude <= limit : magnitude < limit;
    }) ?? null;

  return { bits, unsigned, signed };
}
