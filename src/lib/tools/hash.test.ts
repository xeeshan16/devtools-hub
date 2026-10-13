import { describe, expect, it } from "vitest";
import { findMatchingDigest, hashText, type Digests } from "./hash";

async function digests(input: string, options?: Parameters<typeof hashText>[1]): Promise<Digests> {
  const result = await hashText(input, options);
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.value;
}

describe("hashText", () => {
  it("matches the FIPS 180 test vectors for \"abc\"", async () => {
    expect(await digests("abc")).toEqual({
      "SHA-1": "a9993e364706816aba3e25717850c26c9cd0d89d",
      "SHA-256": "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      "SHA-384":
        "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7",
      "SHA-512":
        "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
    });
  });

  it("hashes empty input to the well-known digests of zero bytes", async () => {
    const result = await digests("");
    expect(result["SHA-1"]).toBe("da39a3ee5e6b4b0d3255bfef95601890afd80709");
    expect(result["SHA-256"]).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("hashes the UTF-8 bytes of non-ASCII text", async () => {
    // Cross-checked against Node's crypto.createHash, not this file's own logic.
    const result = await digests("Zoë ✅");
    expect(result["SHA-256"]).toBe("34b4f35240175abf5724413e4288bfea12ef56796c7fa69a8e53be8f36b9269c");
  });

  it("treats a trailing newline as part of the input", async () => {
    // The usual reason a digest "doesn't match" `echo text | sha256sum`.
    const result = await digests("hello world\n");
    expect(result["SHA-256"]).toBe("a948904f2f0f479b8f8197694b30184b0d2ed1c1cd2a1ec0fb85d299a192a447");
  });

  it("upper-cases hex on request", async () => {
    const result = await digests("abc", { uppercase: true });
    expect(result["SHA-1"]).toBe("A9993E364706816ABA3E25717850C26C9CD0D89D");
  });

  it("encodes as Base64, ignoring uppercase", async () => {
    const result = await digests("abc", { encoding: "base64", uppercase: true });
    expect(result["SHA-1"]).toBe("qZk+NkcGgWq6PiVxeFDCbJzQ2J0=");
    expect(result["SHA-256"]).toBe("ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=");
  });

  it("reports an unpaired surrogate instead of hashing a replacement character", async () => {
    const result = await hashText("ab\uD800c");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unpaired surrogate.*position 3/);

    const lowFirst = await hashText("\uDC00");
    expect(lowFirst.ok).toBe(false);
  });

  it("accepts a correctly paired surrogate (emoji outside the BMP)", async () => {
    const result = await hashText("🚀");
    expect(result.ok).toBe(true);
  });
});

describe("findMatchingDigest", () => {
  it("finds the algorithm whose hex digest matches, ignoring case and whitespace", async () => {
    const result = await digests("abc");
    expect(
      findMatchingDigest(result, "  BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD\n"),
    ).toBe("SHA-256");
  });

  it("compares Base64 exactly, since its case is significant", async () => {
    const result = await digests("abc", { encoding: "base64" });
    expect(findMatchingDigest(result, "qZk+NkcGgWq6PiVxeFDCbJzQ2J0=", "base64")).toBe("SHA-1");
    expect(findMatchingDigest(result, "QZK+NKCGGWQ6PIVXEFDCBJZQ2J0=", "base64")).toBeNull();
  });

  it("returns null for no match or an empty expected value", async () => {
    const result = await digests("abc");
    expect(findMatchingDigest(result, "deadbeef")).toBeNull();
    expect(findMatchingDigest(result, "   ")).toBeNull();
  });
});
