import { encodeBase64, toUrlSafe } from "./base64";
import { err, messageOf, ok, type ToolResult } from "./result";

export type JwtAlgorithm = "HS256" | "HS384" | "HS512";

export const JWT_ALGORITHMS: { id: JwtAlgorithm; hash: "SHA-256" | "SHA-384" | "SHA-512" }[] = [
  { id: "HS256", hash: "SHA-256" },
  { id: "HS384", hash: "SHA-384" },
  { id: "HS512", hash: "SHA-512" },
];

function parseJsonObject(input: string, name: string): ToolResult<Record<string, unknown>> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (e) {
    return err(`${name} is not valid JSON: ${messageOf(e, "parse error")}.`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return err(`${name} must be a JSON object.`);
  }
  return ok(parsed as Record<string, unknown>);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return toUrlSafe(btoa(binary));
}

/**
 * Signs a JWT with HMAC (HS256/384/512) using the Web Crypto API. Every other
 * tool on this site is synchronous — this one can't be, because
 * `crypto.subtle` has no synchronous form in the browser. The signature
 * itself is exact, not an approximation: this is the same primitive a
 * server-side JWT library would call.
 */
export async function signJwt(
  headerJson: string,
  payloadJson: string,
  secret: string,
  algorithm: JwtAlgorithm,
): Promise<ToolResult<string>> {
  const header = parseJsonObject(headerJson, "Header");
  if (!header.ok) return err(header.error);

  const payload = parseJsonObject(payloadJson, "Payload");
  if (!payload.ok) return err(payload.error);

  if (!secret) return err("Enter a secret key to sign with.");

  const spec = JWT_ALGORITHMS.find((a) => a.id === algorithm);
  if (!spec) return err("Unknown algorithm.");

  const headerEncoded = encodeBase64(JSON.stringify(header.value), true);
  const payloadEncoded = encodeBase64(JSON.stringify(payload.value), true);
  if (!headerEncoded.ok) return err(headerEncoded.error);
  if (!payloadEncoded.ok) return err(payloadEncoded.error);

  const signingInput = `${headerEncoded.value}.${payloadEncoded.value}`;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: spec.hash },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(signingInput),
    );
    const signatureBase64Url = bytesToBase64Url(new Uint8Array(signature));
    return ok(`${signingInput}.${signatureBase64Url}`);
  } catch (e) {
    return err(messageOf(e, "Signing failed."));
  }
}
