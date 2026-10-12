import { describe, expect, it } from "vitest";
import { decodeUrl, encodeUrl } from "./url-encoding";

function value(result: { ok: true; value: string } | { ok: false; error: string }) {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.value;
}

describe("encodeUrl", () => {
  it("escapes reserved characters in a component", () => {
    expect(value(encodeUrl("a b&c=d/e?f#g"))).toBe("a%20b%26c%3Dd%2Fe%3Ff%23g");
  });

  it("keeps the structure of a full URL in uri scope", () => {
    expect(value(encodeUrl("https://example.com/a path?q=1 2&x=é#top", { scope: "uri" }))).toBe(
      "https://example.com/a%20path?q=1%202&x=%C3%A9#top",
    );
  });

  it("encodes multi-byte UTF-8 as one escape per byte", () => {
    expect(value(encodeUrl("€"))).toBe("%E2%82%AC");
    expect(value(encodeUrl("✅"))).toBe("%E2%9C%85");
  });

  it("writes spaces as + for form encoding, after escaping any literal +", () => {
    expect(value(encodeUrl("1 + 1", { plusForSpace: true }))).toBe("1+%2B+1");
  });

  it("ignores plusForSpace in uri scope, where + in a path is a literal plus", () => {
    expect(value(encodeUrl("/a b", { scope: "uri", plusForSpace: true }))).toBe("/a%20b");
  });

  it("treats empty input as empty output", () => {
    expect(encodeUrl("")).toEqual({ ok: true, value: "" });
  });

  it("reports an unpaired surrogate instead of throwing", () => {
    const result = encodeUrl("bad \uD800 char");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unpaired surrogate/);
  });
});

describe("decodeUrl", () => {
  it("round-trips text through component encoding", () => {
    const input = "héllo wörld — 世界 ✅ & a=b?c#d";
    expect(value(decodeUrl(value(encodeUrl(input))))).toBe(input);
  });

  it("round-trips form encoding", () => {
    const input = "1 + 1 = 2";
    const encoded = value(encodeUrl(input, { plusForSpace: true }));
    expect(value(decodeUrl(encoded, { plusAsSpace: true }))).toBe(input);
  });

  it("leaves + alone unless asked to read it as a space", () => {
    expect(value(decodeUrl("a+b"))).toBe("a+b");
    expect(value(decodeUrl("a+b", { plusAsSpace: true }))).toBe("a b");
  });

  it("decodes reserved characters that decodeURI would leave escaped", () => {
    expect(value(decodeUrl("q%3D1%26r%3D2"))).toBe("q=1&r=2");
  });

  it("accepts lowercase hex", () => {
    expect(value(decodeUrl("%e2%82%ac"))).toBe("€");
  });

  it("trims surrounding whitespace and treats blank input as empty", () => {
    expect(value(decodeUrl("  a%20b\n"))).toBe("a b");
    expect(decodeUrl("   ")).toEqual({ ok: true, value: "" });
  });

  it("points at a malformed escape by position", () => {
    const result = decodeUrl("100%");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Malformed escape "%" at position 4/);
      expect(result.error).toMatch(/%25/);
    }
  });

  it("rejects a % followed by non-hex characters", () => {
    const result = decodeUrl("a%G1b");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/"%G1" at position 2/);
  });

  it("points at the run of escapes that is not valid UTF-8", () => {
    // %C3 is a two-byte lead byte; %28 is not a continuation byte.
    const result = decodeUrl("ok%20then%C3%28");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/position 10 \("%C3%28"\).*not form valid UTF-8/);
  });
});
