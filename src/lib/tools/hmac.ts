import { loneSurrogateIndex, toBase64, toHex, type DigestEncoding, type HashAlgorithm } from "./hash";
import { err, messageOf, ok, type ToolResult } from "./result";

export type HmacAlgorithm = HashAlgorithm;

export const HMAC_ALGORITHMS: { id: HmacAlgorithm; label: string }[] = [
  { id: "SHA-256", label: "HMAC-SHA256" },
  { id: "SHA-384", label: "HMAC-SHA384" },
  { id: "SHA-512", label: "HMAC-SHA512" },
  { id: "SHA-1", label: "HMAC-SHA1" },
];

/** How the secret key is written: as text, or as the raw bytes in hex or Base64. */
export type KeyEncoding = "utf8" | "hex" | "base64";

export type HmacOptions = {
  algorithm?: HmacAlgorithm;
  keyEncoding?: KeyEncoding;
  encoding?: DigestEncoding;
  /** Upper-case hex digits. Ignored for Base64, where case is significant. */
  uppercase?: boolean;
};

function utf8(input: string, what: string): ToolResult<Uint8Array<ArrayBuffer>> {
  const surrogate = loneSurrogateIndex(input);
  if (surrogate !== -1) {
    return err(
      `${what} contains an unpaired surrogate character at position ${surrogate + 1}, which cannot be represented as UTF-8.`,
    );
  }
  return ok(new TextEncoder().encode(input));
}

/**
 * Turns the key as typed into bytes. Hex may carry a 0x prefix and spaces or
 * colons between bytes; Base64 may be standard or URL-safe, padded or not,
 * because secrets are handed out in all of those forms.
 */
export function decodeKey(key: string, keyEncoding: KeyEncoding): ToolResult<Uint8Array<ArrayBuffer>> {
  if (keyEncoding === "utf8") return utf8(key, "Secret key");

  if (keyEncoding === "hex") {
    const hex = key.trim().replace(/^0x/i, "").replace(/[\s:]/g, "");
    if (/[^0-9a-f]/i.test(hex)) return err("Hex key may only contain the digits 0–9 and letters a–f.");
    if (hex.length % 2 !== 0) return err("Hex key must have an even number of digits (two per byte).");
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return ok(bytes);
  }

  const compact = key.replace(/\s/g, "");
  const unpadded = compact.replace(/=+$/, "");
  if (/[^A-Za-z0-9+/\-_]/.test(unpadded) || unpadded.length % 4 === 1) {
    return err("Base64 key is not valid Base64.");
  }
  const standard = unpadded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4));
  return ok(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

/**
 * Computes the HMAC (RFC 2104) of the UTF-8 bytes of `message` with Web
 * Crypto. Async because `crypto.subtle.sign` has no synchronous form.
 */
export async function hmacText(
  message: string,
  key: string,
  options: HmacOptions = {},
): Promise<ToolResult<string>> {
  const { algorithm = "SHA-256", keyEncoding = "utf8", encoding = "hex", uppercase = false } = options;

  const keyBytes = decodeKey(key, keyEncoding);
  if (!keyBytes.ok) return keyBytes;
  // Web Crypto refuses a zero-length HMAC key, and no real secret is empty.
  if (keyBytes.value.length === 0) return err("Enter a secret key.");

  const data = utf8(message, "Message");
  if (!data.ok) return data;

  try {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBytes.value,
      { name: "HMAC", hash: algorithm },
      false,
      ["sign"],
    );
    const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, data.value));
    if (encoding === "base64") return ok(toBase64(bytes));
    const hex = toHex(bytes);
    return ok(uppercase ? hex.toUpperCase() : hex);
  } catch (e) {
    return err(messageOf(e, "Signing failed."));
  }
}

/**
 * Checks a computed signature against one the user pasted, such as a webhook
 * header. Surrounding whitespace and an algorithm prefix like GitHub's
 * `sha256=` are ignored; hex is compared case-insensitively, Base64 exactly.
 */
export function signatureMatches(
  computed: string,
  expected: string,
  encoding: DigestEncoding = "hex",
): boolean {
  const wanted = expected.trim().replace(/^sha(?:1|256|384|512)=/i, "");
  if (!wanted || !computed) return false;
  return encoding === "hex" ? computed.toLowerCase() === wanted.toLowerCase() : computed === wanted;
}
