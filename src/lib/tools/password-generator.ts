import { err, ok, type ToolResult } from "./result";

export type CharClass = "lower" | "upper" | "number" | "symbol";

export const CHARSETS: Record<CharClass, string> = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  number: "0123456789",
  symbol: "!@#$%^&*()_+-=[]{}|;:,.<>?/~`",
};

export const CHAR_CLASS_LABELS: { id: CharClass; label: string }[] = [
  { id: "lower", label: "Lowercase (a-z)" },
  { id: "upper", label: "Uppercase (A-Z)" },
  { id: "number", label: "Numbers (0-9)" },
  { id: "symbol", label: "Symbols (!@#…)" },
];

/** 0/O, 1/l/I — pairs that are hard to tell apart in many fonts. */
const AMBIGUOUS = new Set(["0", "O", "1", "l", "I"]);

export type PasswordOptions = {
  length: number;
  classes: Record<CharClass, boolean>;
  excludeAmbiguous: boolean;
};

export function buildCharPool(
  options: Pick<PasswordOptions, "classes" | "excludeAmbiguous">,
): string {
  let pool = "";
  for (const cls of Object.keys(CHARSETS) as CharClass[]) {
    if (options.classes[cls]) pool += CHARSETS[cls];
  }
  if (options.excludeAmbiguous) {
    pool = Array.from(pool)
      .filter((c) => !AMBIGUOUS.has(c))
      .join("");
  }
  return pool;
}

/**
 * Worst-case brute-force keyspace, in bits: length × log2(pool size). This is
 * the true entropy of the generator's own output, not an estimate, because
 * every position is drawn independently and uniformly from the full pool —
 * see generatePassword below.
 */
export function passwordEntropyBits(length: number, poolSize: number): number {
  if (poolSize <= 1 || length <= 0) return 0;
  return length * Math.log2(poolSize);
}

export type StrengthLabel = "Weak" | "Fair" | "Strong" | "Very strong";

/**
 * Bands loosely follow widely-cited entropy guidance (sub-40 bits is crackable
 * offline in practical time on consumer hardware; 80+ bits is safe against any
 * foreseeable brute-force attack). Deliberately coarse — the number next to the
 * label is the real figure; the label is just an at-a-glance read of it.
 */
export function strengthLabel(bits: number): StrengthLabel {
  if (bits < 40) return "Weak";
  if (bits < 60) return "Fair";
  if (bits < 80) return "Strong";
  return "Very strong";
}

const MIN_LENGTH = 4;
const MAX_LENGTH = 128;

export function generatePassword(options: PasswordOptions): ToolResult<string> {
  const { length } = options;
  if (!Number.isInteger(length) || length < MIN_LENGTH) {
    return err(`Length must be a whole number of at least ${MIN_LENGTH}.`);
  }
  if (length > MAX_LENGTH) {
    return err(`Length is capped at ${MAX_LENGTH}.`);
  }

  const pool = buildCharPool(options);
  if (!pool) return err("Select at least one character type.");

  const indices = new Uint32Array(length);
  crypto.getRandomValues(indices);

  let out = "";
  for (let i = 0; i < length; i++) {
    out += pool[indices[i] % pool.length];
  }
  return ok(out);
}

export { MIN_LENGTH as PASSWORD_MIN_LENGTH, MAX_LENGTH as PASSWORD_MAX_LENGTH };
