import { describe, expect, it } from "vitest";
import {
  decodeBase64,
  encodeBase64,
  fromUrlSafe,
  toUrlSafe,
} from "./base64";

function value(result: { ok: true; value: string } | { ok: false; error: string }) {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.value;
}

describe("encodeBase64 / decodeBase64", () => {
  it("round-trips ASCII", () => {
    const encoded = value(encodeBase64("devtools-hub"));
    expect(encoded).toBe("ZGV2dG9vbHMtaHVi");
    expect(value(decodeBase64(encoded))).toBe("devtools-hub");
  });

  it("round-trips multi-byte UTF-8, which raw btoa cannot", () => {
    const input = "héllo — 世界 ✅";
    expect(() => btoa(input)).toThrow();
    expect(value(decodeBase64(value(encodeBase64(input))))).toBe(input);
  });

  it("round-trips a string long enough to cross the chunking boundary", () => {
    const input = "x".repeat(0x8000 * 2 + 5);
    expect(value(decodeBase64(value(encodeBase64(input))))).toBe(input);
  });

  it("produces URL-safe output without padding", () => {
    const encoded = value(encodeBase64("subject?id=1&ok=true", true));
    expect(encoded).not.toMatch(/[+/=]/);
    expect(value(decodeBase64(encoded, true))).toBe("subject?id=1&ok=true");
  });

  it("treats empty input as empty output", () => {
    expect(encodeBase64("")).toEqual({ ok: true, value: "" });
    expect(decodeBase64("  ")).toEqual({ ok: true, value: "" });
  });

  it("rejects characters outside the Base64 alphabet", () => {
    const result = decodeBase64("not base64!!");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not valid Base64/);
  });

  it("rejects a payload whose bytes are not valid UTF-8", () => {
    // 0xFF is never a valid UTF-8 lead byte.
    const result = decodeBase64(btoa("ÿþ"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not valid UTF-8/);
  });

  it("decodes a Basic auth credential pair", () => {
    expect(value(decodeBase64("YWRtaW46czNjcmV0"))).toBe("admin:s3cret");
  });
});

describe("toUrlSafe / fromUrlSafe", () => {
  it("swaps the alphabet and strips padding", () => {
    expect(toUrlSafe("ab+/cd==")).toBe("ab-_cd");
  });

  it("restores the alphabet and re-pads to a multiple of four", () => {
    expect(fromUrlSafe("ab-_cd")).toBe("ab+/cd==");
    expect(fromUrlSafe("abcd").length % 4).toBe(0);
  });
});
