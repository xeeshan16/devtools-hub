import { err, ok, type ToolResult } from "./result";

/**
 * How encoded bytes are written out:
 * - `plain`  `48656c6c6f`, the form hash digests and most APIs use
 * - `spaced` `48 65 6c 6c 6f`, a hex dump
 * - `colon`  `48:65:6c:6c:6f`, MAC addresses and certificate fingerprints
 * - `c`      `0x48, 0x65, …`, a C, Java or JavaScript byte array
 * - `escape` `\x48\x65…`, a string literal in C, Python or a shell
 */
export type HexFormat = "plain" | "spaced" | "colon" | "c" | "escape";

export type HexEncodeOptions = {
  format?: HexFormat;
  uppercase?: boolean;
};

const encoder = new TextEncoder();

/**
 * Encodes text as the hex of its UTF-8 bytes, so a non-ASCII character
 * becomes several bytes (é is c3 a9). A lone surrogate cannot be written as
 * UTF-8; TextEncoder replaces it with U+FFFD, which is what a browser sends.
 */
export function textToHex(input: string, options: HexEncodeOptions = {}): string {
  const { format = "plain", uppercase = false } = options;
  const pairs = Array.from(encoder.encode(input), (byte) => {
    const digits = byte.toString(16).padStart(2, "0");
    return uppercase ? digits.toUpperCase() : digits;
  });

  switch (format) {
    case "plain":
      return pairs.join("");
    case "spaced":
      return pairs.join(" ");
    case "colon":
      return pairs.join(":");
    case "c":
      return pairs.map((pair) => `0x${pair}`).join(", ");
    case "escape":
      return pairs.map((pair) => `\\x${pair}`).join("");
  }
}

export type HexDecoded = { text: string; bytes: number };

// Brackets count as separators so a pasted array literal like {0x48, 0x69}
// decodes without editing.
const SEPARATOR = /[\s,:;\-{}[\]]/;
const HEX_DIGIT = /[0-9a-fA-F]/;

function describe(ch: string): string {
  const code = ch.codePointAt(0) ?? 0;
  return code < 0x20 || code === 0x7f
    ? `U+${code.toString(16).toUpperCase().padStart(4, "0")}`
    : `"${ch}"`;
}

/**
 * Returns the offset of the first byte that breaks UTF-8, or -1 when the
 * whole buffer is valid. TextDecoder can reject bad input but cannot say
 * where it is, and "invalid UTF-8" with no position is useless on a long dump.
 */
function firstInvalidUtf8(bytes: Uint8Array): number {
  let i = 0;
  while (i < bytes.length) {
    const lead = bytes[i];
    let length: number;
    let min: number;
    if (lead < 0x80) {
      i += 1;
      continue;
    } else if (lead >= 0xc2 && lead <= 0xdf) {
      length = 2;
      min = 0x80;
    } else if (lead >= 0xe0 && lead <= 0xef) {
      length = 3;
      min = 0x800;
    } else if (lead >= 0xf0 && lead <= 0xf4) {
      length = 4;
      min = 0x10000;
    } else {
      return i;
    }

    let code = lead & (0xff >> (length + 1));
    for (let k = 1; k < length; k++) {
      const next = bytes[i + k];
      if (next === undefined || (next & 0xc0) !== 0x80) return i;
      code = (code << 6) | (next & 0x3f);
    }
    // Overlong forms, UTF-16 surrogates and code points past U+10FFFF are all
    // well-formed bit patterns that UTF-8 nevertheless forbids.
    if (code < min || (code >= 0xd800 && code <= 0xdfff) || code > 0x10ffff) return i;
    i += length;
  }
  return -1;
}

/**
 * Decodes hex bytes as UTF-8 text. Accepts the shapes hex usually turns up
 * in: a continuous run, bytes separated by spaces, colons, commas or dashes,
 * `0x` prefixes on each byte (inside array brackets or not), and `\x`
 * escapes. Anything else is reported with its position rather than silently
 * skipped, because a stray character usually means the input was not hex.
 */
export function hexToText(input: string): ToolResult<HexDecoded> {
  let digits = "";
  // `0x` is only a prefix at the start of a group: in `a0x1` the 0 is data.
  let groupStart = true;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const next = input[i + 1];

    if (SEPARATOR.test(ch)) {
      groupStart = true;
      continue;
    }
    if (ch === "\\" && (next === "x" || next === "X")) {
      i += 1;
      groupStart = true;
      continue;
    }
    if (groupStart && ch === "0" && (next === "x" || next === "X")) {
      i += 1;
      groupStart = false;
      continue;
    }
    if (HEX_DIGIT.test(ch)) {
      digits += ch;
      groupStart = false;
      continue;
    }
    return err(
      `Unexpected character ${describe(ch)} at position ${i + 1}. Hex uses only 0-9 and a-f, optionally separated by spaces, colons, commas or dashes, with 0x or \\x prefixes.`,
    );
  }

  if (digits.length % 2 !== 0) {
    return err(
      `Found ${digits.length} hex digits, an odd number. Every byte is exactly two digits, so one is missing or extra (write 0x5 as 05).`,
    );
  }

  const bytes = new Uint8Array(digits.length / 2);
  for (let b = 0; b < bytes.length; b++) {
    bytes[b] = parseInt(digits.slice(b * 2, b * 2 + 2), 16);
  }

  const invalid = firstInvalidUtf8(bytes);
  if (invalid !== -1) {
    const hex = bytes[invalid].toString(16).padStart(2, "0");
    return err(
      `Byte ${invalid + 1} (${hex}) is not valid UTF-8, so these bytes are not UTF-8 text. They may be binary data, such as a hash or a compressed payload, or text in another encoding.`,
    );
  }

  // ignoreBOM keeps a leading EF BB BF visible as U+FEFF instead of dropping
  // it: the point of decoding hex is to see exactly what the bytes contain.
  const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
  return ok({ text, bytes: bytes.length });
}
