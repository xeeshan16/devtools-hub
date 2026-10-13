import { err, messageOf, ok, type ToolResult } from "./result";

export type HashAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

/** Every digest Web Crypto offers. MD5 is not among them, by design of the API. */
export const HASH_ALGORITHMS: { id: HashAlgorithm; bits: number }[] = [
  { id: "SHA-1", bits: 160 },
  { id: "SHA-256", bits: 256 },
  { id: "SHA-384", bits: 384 },
  { id: "SHA-512", bits: 512 },
];

export type DigestEncoding = "hex" | "base64";

export type HashOptions = {
  encoding?: DigestEncoding;
  /** Upper-case hex digits. Ignored for Base64, where case is significant. */
  uppercase?: boolean;
};

export type Digests = Record<HashAlgorithm, string>;

/** A high surrogate not followed by a low one, or a low one not preceded by a high one. */
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

function toHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Hashes the UTF-8 bytes of `input` with every supported algorithm. Async
 * because `crypto.subtle.digest` has no synchronous form in the browser.
 * Empty input is hashed like any other: the digest of zero bytes is a
 * well-defined value that people do look up.
 */
export async function hashText(input: string, options: HashOptions = {}): Promise<ToolResult<Digests>> {
  const { encoding = "hex", uppercase = false } = options;

  // TextEncoder would silently replace a lone surrogate with U+FFFD, producing
  // a digest of different bytes than the user thinks they typed.
  const surrogate = LONE_SURROGATE.exec(input);
  if (surrogate) {
    return err(
      `Input contains an unpaired surrogate character at position ${surrogate.index + 1}, which cannot be represented as UTF-8.`,
    );
  }

  const data = new TextEncoder().encode(input);

  try {
    const entries = await Promise.all(
      HASH_ALGORITHMS.map(async ({ id }) => {
        const bytes = new Uint8Array(await crypto.subtle.digest(id, data));
        if (encoding === "base64") return [id, toBase64(bytes)] as const;
        const hex = toHex(bytes);
        return [id, uppercase ? hex.toUpperCase() : hex] as const;
      }),
    );
    return ok(Object.fromEntries(entries) as Digests);
  } catch (e) {
    return err(messageOf(e, "Hashing failed."));
  }
}

/**
 * Finds which digest, if any, equals a hash the user pasted to verify against.
 * Surrounding whitespace is ignored, and hex is compared case-insensitively;
 * Base64 is compared exactly because its letters are case-sensitive.
 */
export function findMatchingDigest(
  digests: Digests,
  expected: string,
  encoding: DigestEncoding = "hex",
): HashAlgorithm | null {
  const wanted = expected.trim();
  if (!wanted) return null;

  for (const { id } of HASH_ALGORITHMS) {
    const actual = digests[id];
    const equal =
      encoding === "hex" ? actual.toLowerCase() === wanted.toLowerCase() : actual === wanted;
    if (equal) return id;
  }
  return null;
}
