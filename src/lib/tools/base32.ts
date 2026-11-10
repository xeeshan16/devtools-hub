import { err, ok, type ToolResult } from "./result";

/**
 * The three Base32 alphabets in common use:
 * - `rfc4648`   A-Z then 2-7, the standard alphabet (TOTP secrets, onion addresses)
 * - `hex`       0-9 then A-V, RFC 4648 "base32hex", which keeps sort order
 * - `crockford` Douglas Crockford's alphabet without I, L, O and U, used by ULID
 */
export type Base32Variant = "rfc4648" | "hex" | "crockford";

const ALPHABETS: Record<Base32Variant, string> = {
  rfc4648: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
  hex: "0123456789ABCDEFGHIJKLMNOPQRSTUV",
  crockford: "0123456789ABCDEFGHJKMNPQRSTVWXYZ",
};

const CHARACTER_SETS: Record<Base32Variant, string> = {
  rfc4648: "RFC 4648 Base32 uses A-Z and 2-7.",
  hex: "Base32hex uses 0-9 and A-V.",
  crockford: "Crockford Base32 uses 0-9 and the letters A-Z except U.",
};

function invalidCharacterHint(ch: string, variant: Base32Variant): string {
  if (variant === "crockford" && (ch === "U" || ch === "u")) return "Crockford Base32 leaves out U.";
  if (variant === "crockford" && ch === "=") return "Crockford Base32 has no padding.";
  return CHARACTER_SETS[variant];
}

function decodeTable(variant: Base32Variant): Map<string, number> {
  const table = new Map<string, number>();
  [...ALPHABETS[variant]].forEach((ch, i) => {
    table.set(ch, i);
    table.set(ch.toLowerCase(), i);
  });
  if (variant === "crockford") {
    // Crockford decodes the letters it leaves out as the digits they resemble,
    // so a code read aloud or typed by hand still decodes.
    for (const [ch, i] of [["O", 0], ["I", 1], ["L", 1]] as const) {
      table.set(ch, i);
      table.set(ch.toLowerCase(), i);
    }
  }
  return table;
}

const TABLES: Record<Base32Variant, Map<string, number>> = {
  rfc4648: decodeTable("rfc4648"),
  hex: decodeTable("hex"),
  crockford: decodeTable("crockford"),
};

export type Base32EncodeOptions = {
  variant?: Base32Variant;
  /** Pad to a multiple of eight characters with `=`. Ignored for Crockford, which has no padding. */
  padding?: boolean;
};

/** Encodes raw bytes as Base32, five bits per character. */
export function bytesToBase32(bytes: Uint8Array, options: Base32EncodeOptions = {}): string {
  const { variant = "rfc4648", padding = true } = options;
  const alphabet = ALPHABETS[variant];
  let out = "";
  let buffer = 0;
  let bits = 0;

  for (const byte of bytes) {
    buffer = ((buffer << 8) | byte) & 0xfff;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += alphabet[(buffer >> bits) & 31];
    }
  }
  if (bits > 0) out += alphabet[(buffer << (5 - bits)) & 31];

  if (padding && variant !== "crockford") {
    while (out.length % 8 !== 0) out += "=";
  }
  return out;
}

/** Encodes text as the Base32 of its UTF-8 bytes. */
export function encodeBase32(input: string, options: Base32EncodeOptions = {}): string {
  return bytesToBase32(new TextEncoder().encode(input), options);
}

export type Base32Decoded = {
  /** The bytes as UTF-8 text, or null when they are not valid UTF-8 (a TOTP secret, a key). */
  text: string | null;
  /** The bytes as lowercase hex, always available so binary payloads stay readable. */
  hex: string;
  bytes: number;
};

// Data characters left over after the last full 8-character block. Five bits
// per character means only these remainders end on a whole byte (with fewer
// than five spare bits); 1, 3 or 6 characters cannot come from any input.
const VALID_REMAINDERS = new Set([0, 2, 4, 5, 7]);
const PADDING_FOR_REMAINDER: Record<number, number> = { 0: 0, 2: 6, 4: 4, 5: 3, 7: 1 };

function describe(ch: string): string {
  const code = ch.codePointAt(0) ?? 0;
  return code < 0x20 || code === 0x7f
    ? `U+${code.toString(16).toUpperCase().padStart(4, "0")}`
    : `"${ch}"`;
}

/**
 * Decodes Base32 in the given alphabet. Case is ignored, as are whitespace and
 * line breaks (and, for Crockford, the hyphens it allows as group separators).
 * Padding is optional, but when present it must be the amount the length
 * implies, since a wrong amount usually means a truncated or merged value.
 */
export function decodeBase32(input: string, variant: Base32Variant = "rfc4648"): ToolResult<Base32Decoded> {
  const table = TABLES[variant];
  const values: number[] = [];
  let padding = 0;
  let paddingAt = -1;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (/\s/.test(ch) || (variant === "crockford" && ch === "-")) continue;

    if (ch === "=" && variant !== "crockford") {
      if (padding === 0) paddingAt = i;
      padding += 1;
      continue;
    }

    const value = table.get(ch);
    if (value === undefined) {
      return err(`Unexpected character ${describe(ch)} at position ${i + 1}. ${invalidCharacterHint(ch, variant)}`);
    }
    if (padding > 0) {
      return err(
        `Found "${ch}" at position ${i + 1}, after the = padding at position ${paddingAt + 1}. Padding can only appear at the end.`,
      );
    }
    values.push(value);
  }

  const remainder = values.length % 8;
  if (!VALID_REMAINDERS.has(remainder)) {
    return err(
      `${values.length} Base32 characters cannot be decoded: no input encodes to a length that leaves ${remainder} character${remainder === 1 ? "" : "s"} after the last group of eight. The value is probably truncated or has an extra character.`,
    );
  }
  if (padding > 0 && padding !== PADDING_FOR_REMAINDER[remainder]) {
    const expected = PADDING_FOR_REMAINDER[remainder];
    return err(
      `Found ${padding} padding character${padding === 1 ? "" : "s"}, but ${values.length} characters need ${expected === 0 ? "none" : expected}. Padding fills the last group to eight characters.`,
    );
  }

  const bytes = new Uint8Array(Math.floor((values.length * 5) / 8));
  let buffer = 0;
  let bits = 0;
  let index = 0;
  for (const value of values) {
    buffer = ((buffer << 5) | value) & 0xfff;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes[index++] = (buffer >> bits) & 0xff;
    }
  }

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  let text: string | null;
  try {
    // ignoreBOM keeps a leading U+FEFF visible; fatal reports binary data as
    // such instead of rendering it as replacement characters.
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    text = null;
  }
  return ok({ text, hex, bytes: bytes.length });
}
