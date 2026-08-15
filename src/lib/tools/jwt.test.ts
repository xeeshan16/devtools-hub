import { describe, expect, it } from "vitest";
import { encodeBase64 } from "./base64";
import { decodeJwt } from "./jwt";

function segment(value: unknown): string {
  const encoded = encodeBase64(JSON.stringify(value), true);
  if (!encoded.ok) throw new Error(encoded.error);
  return encoded.value;
}

function token(
  payload: Record<string, unknown>,
  header: Record<string, unknown> = { alg: "HS256", typ: "JWT" },
): string {
  return `${segment(header)}.${segment(payload)}.c2lnbmF0dXJl`;
}

const NOW = new Date("2024-06-01T12:00:00Z");
const NOW_S = Math.floor(NOW.getTime() / 1000);

describe("decodeJwt", () => {
  it("decodes the header, payload and signature", () => {
    const result = decodeJwt(token({ sub: "1234567890" }), NOW);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.header).toEqual({ alg: "HS256", typ: "JWT" });
    expect(result.value.payload).toEqual({ sub: "1234567890" });
    expect(result.value.signature).toBe("c2lnbmF0dXJl");
  });

  it("strips a Bearer prefix and surrounding whitespace", () => {
    const result = decodeJwt(`  Bearer ${token({ sub: "a" })}  `, NOW);
    expect(result.ok).toBe(true);
  });

  it("flags an expired token", () => {
    const result = decodeJwt(token({ exp: NOW_S - 60 }), NOW);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.expired).toBe(true);
    expect(result.value.notes).toContainEqual(
      expect.objectContaining({ claim: "exp", status: "error" }),
    );
  });

  it("accepts a token that has not yet expired", () => {
    const result = decodeJwt(token({ exp: NOW_S + 3600 }), NOW);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.expired).toBe(false);
  });

  it("reports null expiry when there is no exp claim", () => {
    const result = decodeJwt(token({ sub: "a" }), NOW);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.expired).toBeNull();
  });

  it("warns when nbf is still in the future", () => {
    const result = decodeJwt(token({ nbf: NOW_S + 600 }), NOW);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.notes).toContainEqual(
      expect.objectContaining({ claim: "nbf", status: "warn" }),
    );
  });

  it("flags the unsigned alg=none case", () => {
    const result = decodeJwt(token({ sub: "a" }, { alg: "none" }), NOW);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.notes).toContainEqual(
      expect.objectContaining({ claim: "alg", status: "error" }),
    );
  });

  it("joins an array audience into one readable value", () => {
    const result = decodeJwt(token({ aud: ["api", "web"] }), NOW);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.notes).toContainEqual(
      expect.objectContaining({ claim: "aud", detail: "api, web" }),
    );
  });

  it("rejects input that is not three dot-separated parts", () => {
    expect(decodeJwt("", NOW).ok).toBe(false);
    expect(decodeJwt("a.b", NOW).ok).toBe(false);
    expect(decodeJwt("a.b.c.d", NOW).ok).toBe(false);
  });

  it("rejects a segment that decodes to something other than a JSON object", () => {
    const bad = `${segment({ alg: "HS256" })}.${segment([1, 2, 3])}.sig`;
    const result = decodeJwt(bad, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/must be a JSON object/);
  });

  it("rejects a segment that is not valid Base64URL JSON", () => {
    const result = decodeJwt(`${segment({ alg: "HS256" })}.bm90LWpzb24.sig`, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not valid JSON/);
  });
});
