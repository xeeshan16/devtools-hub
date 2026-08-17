import { describe, expect, it } from "vitest";
import { signJwt } from "./jwt-encoder";

describe("signJwt", () => {
  it("matches the canonical jwt.io HS256 example byte-for-byte", async () => {
    // https://jwt.io's own worked example — the strongest correctness check
    // available, since it's a fixed reference token nobody controls but us.
    const header = JSON.stringify({ alg: "HS256", typ: "JWT" });
    const payload = JSON.stringify({ sub: "1234567890", name: "John Doe", iat: 1516239022 });
    const result = await signJwt(header, payload, "your-256-bit-secret", "HS256");
    if (!result.ok) throw new Error(result.error);
    expect(result.value).toBe(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    );
  });

  it("matches an independently computed HMAC (Node's crypto module) for a different secret", async () => {
    // Cross-checked against Node's crypto.createHmac, not this file's own logic.
    const header = JSON.stringify({ alg: "HS256", typ: "JWT" });
    const payload = JSON.stringify({ sub: "1234567890", name: "John Doe", iat: 1516239022 });
    const result = await signJwt(header, payload, "a-different-secret", "HS256");
    if (!result.ok) throw new Error(result.error);
    expect(result.value).toBe(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.NmiVtilivmBRledPcmm5nD_NWDy1rYX8v1ce8f2r4dA",
    );
  });

  it("matches an independently computed HMAC for HS512", async () => {
    const header = JSON.stringify({ alg: "HS512", typ: "JWT" });
    const payload = JSON.stringify({ sub: "1234567890", name: "John Doe", iat: 1516239022 });
    const result = await signJwt(header, payload, "your-256-bit-secret", "HS512");
    if (!result.ok) throw new Error(result.error);
    expect(result.value).toBe(
      "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.pazba9Pj009HgANP4pTCQAHpXNU7pVbjIGff_plktSzsa9rXTGzFngaawzXGEO6Q0Hx5dtGi-dMDlIadV81o3Q",
    );
  });

  it("produces a token with exactly three dot-separated segments", async () => {
    const result = await signJwt('{"alg":"HS256"}', '{"sub":"1"}', "secret", "HS256");
    if (!result.ok) throw new Error(result.error);
    expect(result.value.split(".")).toHaveLength(3);
  });

  it("produces a different signature for HS384 and HS512 than HS256", async () => {
    const header = '{"alg":"HS256"}';
    const payload = '{"sub":"1"}';
    const a = await signJwt(header, payload, "secret", "HS256");
    const b = await signJwt(header, payload, "secret", "HS384");
    const c = await signJwt(header, payload, "secret", "HS512");
    if (!a.ok || !b.ok || !c.ok) throw new Error("signing failed");
    expect(a.value).not.toBe(b.value);
    expect(b.value).not.toBe(c.value);
    // Signature length scales with the hash's output size.
    expect(c.value.split(".")[2].length).toBeGreaterThan(b.value.split(".")[2].length);
    expect(b.value.split(".")[2].length).toBeGreaterThan(a.value.split(".")[2].length);
  });

  it("produces a different signature for a different secret, same payload", async () => {
    const header = '{"alg":"HS256"}';
    const payload = '{"sub":"1"}';
    const a = await signJwt(header, payload, "secret-one", "HS256");
    const b = await signJwt(header, payload, "secret-two", "HS256");
    if (!a.ok || !b.ok) throw new Error("signing failed");
    expect(a.value).not.toBe(b.value);
  });

  it("rejects invalid JSON in either header or payload", async () => {
    expect((await signJwt("not json", '{"sub":"1"}', "secret", "HS256")).ok).toBe(false);
    expect((await signJwt('{"alg":"HS256"}', "not json", "secret", "HS256")).ok).toBe(false);
  });

  it("rejects a header or payload that is not a JSON object", async () => {
    expect((await signJwt("[1,2,3]", '{"sub":"1"}', "secret", "HS256")).ok).toBe(false);
    expect((await signJwt('{"alg":"HS256"}', "42", "secret", "HS256")).ok).toBe(false);
  });

  it("rejects an empty secret", async () => {
    const result = await signJwt('{"alg":"HS256"}', '{"sub":"1"}', "", "HS256");
    expect(result.ok).toBe(false);
  });
});
