import { describe, expect, it } from "vitest";
import { decodeKey, hmacText, signatureMatches } from "./hmac";

async function sign(message: string, key: string, options?: Parameters<typeof hmacText>[2]): Promise<string> {
  const result = await hmacText(message, key, options);
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.value;
}

const JEFE = "what do ya want for nothing?";

describe("hmacText", () => {
  it("matches RFC 4231 test case 2 for every SHA-2 size", async () => {
    expect(await sign(JEFE, "Jefe", { algorithm: "SHA-256" })).toBe(
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );
    expect(await sign(JEFE, "Jefe", { algorithm: "SHA-384" })).toBe(
      "af45d2e376484031617f78d2b58a6b1b9c7ef464f5a01b47e42ec3736322445e8e2240ca5e69e2c78b3239ecfab21649",
    );
    expect(await sign(JEFE, "Jefe", { algorithm: "SHA-512" })).toBe(
      "164b7a7bfcf819e2e395fbe73b56e0a387bd64222e831fd610270cd7ea2505549758bf75c05a994a6d034f65f8f0e6fdcaeab1a34d4a6b4b636e070a38bce737",
    );
  });

  it("matches RFC 2202 test case 2 for HMAC-SHA1", async () => {
    expect(await sign(JEFE, "Jefe", { algorithm: "SHA-1" })).toBe("effcdf6ae5eb2fa2d27416d5f184df9c259a7c79");
  });

  it("defaults to HMAC-SHA256 in lower-case hex", async () => {
    expect(await sign(JEFE, "Jefe")).toBe("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");
  });

  it("accepts a hex key, matching RFC 4231 test case 1", async () => {
    const key = "0b".repeat(20);
    const expected = "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7";
    expect(await sign("Hi There", key, { keyEncoding: "hex" })).toBe(expected);
    expect(await sign("Hi There", `0x${key.toUpperCase()}`, { keyEncoding: "hex" })).toBe(expected);
  });

  it("accepts standard and URL-safe Base64 keys, padded or not", async () => {
    // Bytes fb ff bf 00 01; cross-checked against Node's crypto.createHmac.
    const expected = "ac07689f841daa7e1a90cdf133ed9acc638236eaeede082a49964cb53c68d6d6";
    expect(await sign("abc", "+/+/AAE=", { keyEncoding: "base64" })).toBe(expected);
    expect(await sign("abc", "-_-_AAE", { keyEncoding: "base64" })).toBe(expected);
  });

  it("signs the UTF-8 bytes of non-ASCII message and key", async () => {
    // Cross-checked against Node's crypto.createHmac, not this file's own logic.
    expect(await sign("Zoë ✅", "clé")).toBe("9bc6ba51359072609b70e85f33c94e1404ead5373f3fa321454e45a430372cf0");
  });

  it("encodes as Base64 and upper-cases hex only when asked", async () => {
    expect(await sign(JEFE, "Jefe", { encoding: "base64" })).toBe("W9zBRr9gdU5qBCQmCJV1x1oAPwidJzmDnexYuWTsOEM=");
    expect(await sign(JEFE, "Jefe", { uppercase: true })).toBe(
      "5BDCC146BF60754E6A042426089575C75A003F089D2739839DEC58B964EC3843",
    );
    expect(await sign(JEFE, "Jefe", { encoding: "base64", uppercase: true })).toBe(
      "W9zBRr9gdU5qBCQmCJV1x1oAPwidJzmDnexYuWTsOEM=",
    );
  });

  it("signs an empty message, which is well defined", async () => {
    const result = await hmacText("", "key");
    expect(result.ok).toBe(true);
  });

  it("rejects an empty key", async () => {
    expect(await hmacText("hello", "")).toEqual({ ok: false, error: "Enter a secret key." });
    expect(await hmacText("hello", "  ", { keyEncoding: "hex" })).toEqual({ ok: false, error: "Enter a secret key." });
  });

  it("rejects lone surrogates instead of signing different bytes", async () => {
    const message = await hmacText("ab\uD800", "key");
    expect(message.ok).toBe(false);
    if (!message.ok) expect(message.error).toMatch(/^Message .* position 3/);

    const key = await hmacText("hello", "\uDC00");
    expect(key.ok).toBe(false);
    if (!key.ok) expect(key.error).toMatch(/^Secret key .* position 1/);
  });
});

describe("decodeKey", () => {
  it("ignores spaces and colons between hex bytes", () => {
    const result = decodeKey("de:ad be ef", "hex");
    expect(result.ok && Array.from(result.value)).toEqual([0xde, 0xad, 0xbe, 0xef]);
  });

  it("explains invalid hex", () => {
    expect(decodeKey("abc", "hex")).toEqual({
      ok: false,
      error: "Hex key must have an even number of digits (two per byte).",
    });
    expect(decodeKey("zz", "hex")).toEqual({
      ok: false,
      error: "Hex key may only contain the digits 0–9 and letters a–f.",
    });
  });

  it("rejects invalid Base64", () => {
    expect(decodeKey("a!b=", "base64").ok).toBe(false);
    expect(decodeKey("abcde", "base64").ok).toBe(false);
  });
});

describe("signatureMatches", () => {
  // The example from GitHub's "Validating webhook deliveries" documentation.
  const computed = "757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17";

  it("verifies a GitHub webhook signature header end to end", async () => {
    const signature = await sign("Hello, World!", "It's a Secret to Everybody");
    expect(signature).toBe(computed);
    expect(signatureMatches(signature, `sha256=${computed}`)).toBe(true);
  });

  it("ignores whitespace and hex case", () => {
    expect(signatureMatches(computed, `  ${computed.toUpperCase()}\n`)).toBe(true);
  });

  it("compares Base64 exactly", () => {
    const b64 = "W9zBRr9gdU5qBCQmCJV1x1oAPwidJzmDnexYuWTsOEM=";
    expect(signatureMatches(b64, b64, "base64")).toBe(true);
    expect(signatureMatches(b64, b64.toLowerCase(), "base64")).toBe(false);
  });

  it("does not match empty or different values", () => {
    expect(signatureMatches(computed, "")).toBe(false);
    expect(signatureMatches("", "")).toBe(false);
    expect(signatureMatches(computed, computed.slice(0, -1) + "0")).toBe(false);
  });
});
