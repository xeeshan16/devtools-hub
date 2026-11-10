import { describe, expect, it } from "vitest";
import { bytesToBase32, decodeBase32, encodeBase32, type Base32Decoded } from "./base32";
import type { ToolResult } from "./result";

function value(result: ToolResult<Base32Decoded>) {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.value;
}

function error(result: ToolResult<Base32Decoded>) {
  if (result.ok) throw new Error(`expected an error, got: ${result.value.hex}`);
  return result.error;
}

// RFC 4648 section 10 test vectors.
const RFC_VECTORS: [string, string, string][] = [
  ["", "", ""],
  ["f", "MY======", "CO======"],
  ["fo", "MZXQ====", "CPNG===="],
  ["foo", "MZXW6===", "CPNMU==="],
  ["foob", "MZXW6YQ=", "CPNMUOG="],
  ["fooba", "MZXW6YTB", "CPNMUOJ1"],
  ["foobar", "MZXW6YTBOI======", "CPNMUOJ1E8======"],
];

describe("encodeBase32", () => {
  it("matches the RFC 4648 test vectors for both alphabets", () => {
    for (const [input, base32, base32hex] of RFC_VECTORS) {
      expect(encodeBase32(input)).toBe(base32);
      expect(encodeBase32(input, { variant: "hex" })).toBe(base32hex);
    }
  });

  it("omits padding on request", () => {
    expect(encodeBase32("foobar", { padding: false })).toBe("MZXW6YTBOI");
    expect(encodeBase32("f", { variant: "hex", padding: false })).toBe("CO");
  });

  it("never pads Crockford output", () => {
    expect(encodeBase32("foobar", { variant: "crockford" })).toBe("CSQPYRK1E8");
    expect(encodeBase32("f", { variant: "crockford", padding: true })).toBe("CR");
  });

  it("encodes text as its UTF-8 bytes", () => {
    // é is c3 a9.
    expect(encodeBase32("é")).toBe(bytesToBase32(new Uint8Array([0xc3, 0xa9])));
    expect(encodeBase32("é")).toBe("YOUQ====");
  });

  it("encodes arbitrary bytes", () => {
    expect(bytesToBase32(new Uint8Array([0, 0, 0, 0, 0]))).toBe("AAAAAAAA");
    expect(bytesToBase32(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff]))).toBe("77777777");
  });
});

describe("decodeBase32", () => {
  it("decodes the RFC 4648 test vectors for both alphabets", () => {
    for (const [input, base32, base32hex] of RFC_VECTORS) {
      expect(value(decodeBase32(base32)).text).toBe(input);
      expect(value(decodeBase32(base32hex, "hex")).text).toBe(input);
    }
  });

  it("accepts lowercase, missing padding and whitespace", () => {
    expect(value(decodeBase32("mzxw6ytboi")).text).toBe("foobar");
    expect(value(decodeBase32("MZXW 6YTB\nOI======")).text).toBe("foobar");
    expect(value(decodeBase32("  MY  ")).text).toBe("f");
  });

  it("reports byte count and hex alongside the text", () => {
    expect(value(decodeBase32("MZXW6==="))).toEqual({ text: "foo", hex: "666f6f", bytes: 3 });
  });

  it("returns hex and null text for bytes that are not UTF-8", () => {
    // A typical 80-bit TOTP secret is random bytes, not text.
    expect(value(decodeBase32("77777777"))).toEqual({ text: null, hex: "ffffffffff", bytes: 5 });
  });

  it("returns nothing for empty or whitespace-only input", () => {
    expect(value(decodeBase32(""))).toEqual({ text: "", hex: "", bytes: 0 });
    expect(value(decodeBase32(" \n ")).bytes).toBe(0);
  });

  it("decodes Crockford with hyphens and look-alike letters", () => {
    expect(value(decodeBase32("CSQP-YRK1-E8", "crockford")).text).toBe("foobar");
    expect(value(decodeBase32("csqpyrkie8", "crockford")).text).toBe("foobar");
    expect(value(decodeBase32("CSQPYRKLE8", "crockford")).text).toBe("foobar");
    expect(value(decodeBase32("O0", "crockford")).hex).toBe("00");
  });

  it("reports a character outside the alphabet with its position", () => {
    expect(error(decodeBase32("MZX1"))).toContain('Unexpected character "1" at position 4');
    expect(error(decodeBase32("CPNW", "hex"))).toContain('"W" at position 4');
    expect(error(decodeBase32("CSQU", "crockford"))).toContain("leaves out U");
    expect(error(decodeBase32("CR==", "crockford"))).toContain("has no padding");
  });

  it("names control characters by code point", () => {
    expect(error(decodeBase32("MY\u0000"))).toContain("U+0000 at position 3");
  });

  it("rejects data after padding", () => {
    expect(error(decodeBase32("MY======MY"))).toContain("after the = padding at position 3");
  });

  it("rejects lengths no input can produce", () => {
    expect(error(decodeBase32("M"))).toContain("1 Base32 characters cannot be decoded");
    expect(error(decodeBase32("MZX"))).toContain("leaves 3 characters");
    expect(error(decodeBase32("MZXW6Y"))).toContain("leaves 6 characters");
  });

  it("rejects the wrong amount of padding", () => {
    expect(error(decodeBase32("MY=="))).toContain("Found 2 padding characters, but 2 characters need 6");
    expect(error(decodeBase32("MZXW6YTB="))).toContain("need none");
  });

  it("keeps a leading byte order mark visible", () => {
    expect(value(decodeBase32(bytesToBase32(new Uint8Array([0xef, 0xbb, 0xbf, 0x41])))).text).toBe("﻿A");
  });

  it("round-trips every variant with and without padding", () => {
    const samples = ["Hello, world", "line1\r\nline2\ttab", "Zoë 😀 €", "\u0000\u007f", "a", "ab", "abc", "abcd"];
    for (const sample of samples) {
      for (const variant of ["rfc4648", "hex", "crockford"] as const) {
        for (const padding of [true, false]) {
          expect(value(decodeBase32(encodeBase32(sample, { variant, padding }), variant)).text).toBe(sample);
        }
      }
    }
  });
});
