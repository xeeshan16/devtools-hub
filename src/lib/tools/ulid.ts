import { err, ok, type ToolResult } from "./result";

/**
 * ULID (https://github.com/ulid/spec): a 48-bit millisecond timestamp followed
 * by 80 random bits, written as 26 Crockford Base32 characters. The timestamp
 * comes first, so ULIDs sort lexicographically by creation time.
 */

/** Crockford's Base32 alphabet — no I, L, O or U, to avoid misreading. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const TIME_LENGTH = 10;
const RANDOM_LENGTH = 16;
const ULID_LENGTH = TIME_LENGTH + RANDOM_LENGTH;

export const MAX_ULID_TIME = 2 ** 48 - 1;
export const MAX_ULID_BATCH = 1000;

export type RandomSource = (length: number) => Uint8Array;

const cryptoRandom: RandomSource = (length) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

function encodeTime(ms: number): string {
  let out = "";
  let value = ms;
  for (let i = 0; i < TIME_LENGTH; i++) {
    out = ALPHABET[value % 32] + out;
    value = Math.floor(value / 32);
  }
  return out;
}

function encodeRandom(random: RandomSource): string {
  // 80 random bits are exactly 16 Base32 characters.
  let bits = 0n;
  for (const byte of random(10)) bits = (bits << 8n) | BigInt(byte);
  let out = "";
  for (let i = 0; i < RANDOM_LENGTH; i++) {
    out = ALPHABET[Number(bits & 31n)] + out;
    bits >>= 5n;
  }
  return out;
}

/** Adds one to a Base32 string, or returns null when it would overflow. */
function increment(value: string): string | null {
  const chars = value.split("");
  for (let i = chars.length - 1; i >= 0; i--) {
    const index = ALPHABET.indexOf(chars[i]);
    if (index < 31) {
      chars[i] = ALPHABET[index + 1];
      return chars.join("");
    }
    chars[i] = ALPHABET[0];
  }
  return null;
}

export type UlidOptions = {
  /** Unix time in milliseconds; defaults to now. */
  now?: number;
  /**
   * Within a single millisecond, increment the random part instead of drawing
   * a new one, so a batch keeps its generation order when sorted.
   */
  monotonic?: boolean;
  random?: RandomSource;
};

export function generateUlids(
  count: number,
  options: UlidOptions = {},
): ToolResult<string[]> {
  if (!Number.isInteger(count) || count < 1) {
    return err("Count must be a whole number of at least 1.");
  }
  if (count > MAX_ULID_BATCH) {
    return err(`Count is capped at ${MAX_ULID_BATCH} per batch.`);
  }

  const now = options.now ?? Date.now();
  if (!Number.isInteger(now) || now < 0 || now > MAX_ULID_TIME) {
    return err("Timestamp must be a whole number of milliseconds between 0 and 2^48 − 1.");
  }

  const random = options.random ?? cryptoRandom;
  const time = encodeTime(now);
  const ulids: string[] = [];
  let previous = encodeRandom(random);

  for (let i = 0; i < count; i++) {
    if (i > 0) {
      if (options.monotonic) {
        const next = increment(previous);
        // Astronomically unlikely: 2^80 ULIDs in one millisecond.
        if (next === null) return err("Random component overflowed within one millisecond.");
        previous = next;
      } else {
        previous = encodeRandom(random);
      }
    }
    ulids.push(time + previous);
  }

  return ok(ulids);
}

export type UlidInfo = {
  /** Canonical upper-case form. */
  ulid: string;
  timestamp: Date;
  /** The 80-bit random component as 20 hex digits. */
  randomHex: string;
  /** The same 128 bits formatted as a UUID, as many databases store ULIDs. */
  uuid: string;
};

export function inspectUlid(input: string): ToolResult<UlidInfo> {
  const value = input.trim().toUpperCase();
  if (!value) return err("Enter a ULID to inspect.");
  if (value.length !== ULID_LENGTH) {
    return err(`A ULID is ${ULID_LENGTH} characters long; this is ${value.length}.`);
  }

  let bits = 0n;
  for (const char of value) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) {
      return err(
        `"${char}" is not a Crockford Base32 character — ULIDs use 0–9 and A–Z without I, L, O or U.`,
      );
    }
    bits = (bits << 5n) | BigInt(index);
  }

  // 26 characters carry 130 bits; the top two must be zero for a 128-bit value.
  if (bits >> 128n !== 0n) {
    return err("Out of range — the first character of a ULID can be at most 7.");
  }

  const hex = bits.toString(16).padStart(32, "0");
  const uuid = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");

  return ok({
    ulid: value,
    timestamp: new Date(Number(bits >> 80n)),
    randomHex: hex.slice(12),
    uuid,
  });
}
