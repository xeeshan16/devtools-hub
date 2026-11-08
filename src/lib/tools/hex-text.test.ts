import { describe, expect, it } from "vitest";
import { hexToText, textToHex, type HexDecoded } from "./hex-text";
import type { ToolResult } from "./result";

function value(result: ToolResult<HexDecoded>) {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.value;
}

function error(result: ToolResult<HexDecoded>) {
  if (result.ok) throw new Error(`expected an error, got: ${result.value.text}`);
  return result.error;
}

describe("textToHex", () => {
  it("encodes ASCII as one byte per character", () => {
    expect(textToHex("Hello")).toBe("48656c6c6f");
  });

  it("encodes non-ASCII text as its UTF-8 bytes", () => {
    expect(textToHex("é")).toBe("c3a9");
    expect(textToHex("€")).toBe("e282ac");
    expect(textToHex("😀")).toBe("f09f9880");
  });

  it("returns an empty string for empty input", () => {
    expect(textToHex("")).toBe("");
    expect(textToHex("", { format: "c" })).toBe("");
  });

  it("writes each output format", () => {
    expect(textToHex("Hi!", { format: "spaced" })).toBe("48 69 21");
    expect(textToHex("Hi!", { format: "colon" })).toBe("48:69:21");
    expect(textToHex("Hi!", { format: "c" })).toBe("0x48, 0x69, 0x21");
    expect(textToHex("Hi!", { format: "escape" })).toBe("\\x48\\x69\\x21");
  });

  it("uppercases digits on request but never the 0x or \\x prefix", () => {
    expect(textToHex("\nÿ", { uppercase: true })).toBe("0AC3BF");
    expect(textToHex("\n", { format: "c", uppercase: true })).toBe("0x0A");
    expect(textToHex("\n", { format: "escape", uppercase: true })).toBe("\\x0A");
  });

  it("writes a lone surrogate as the UTF-8 replacement character", () => {
    expect(textToHex("a\ud800b")).toBe("61efbfbd62");
  });
});

describe("hexToText", () => {
  it("decodes a continuous run of hex in either case", () => {
    expect(value(hexToText("48656c6c6f"))).toEqual({ text: "Hello", bytes: 5 });
    expect(value(hexToText("48656C6C6F")).text).toBe("Hello");
  });

  it("decodes multi-byte UTF-8 sequences", () => {
    expect(value(hexToText("436166c3a920f09f9880"))).toEqual({ text: "Café 😀", bytes: 10 });
  });

  it("accepts spaces, line breaks, colons, commas and dashes between bytes", () => {
    expect(value(hexToText("48 69\n21")).text).toBe("Hi!");
    expect(value(hexToText("48:69:21")).text).toBe("Hi!");
    expect(value(hexToText("48-69-21")).text).toBe("Hi!");
    expect(value(hexToText("  48,69 , 21  ")).text).toBe("Hi!");
  });

  it("accepts 0x prefixes and \\x escapes", () => {
    expect(value(hexToText("0x48, 0x69, 0X21")).text).toBe("Hi!");
    expect(value(hexToText("{0x48,0x69}")).text).toBe("Hi");
    expect(value(hexToText("\\x48\\x69\\X21")).text).toBe("Hi!");
    expect(value(hexToText("0x4869")).text).toBe("Hi");
  });

  it("treats 0x as data, not a prefix, in the middle of a group", () => {
    expect(error(hexToText("a0x1"))).toContain('Unexpected character "x" at position 3');
  });

  it("returns empty text for empty or separator-only input", () => {
    expect(value(hexToText(""))).toEqual({ text: "", bytes: 0 });
    expect(value(hexToText("  \n ")).bytes).toBe(0);
  });

  it("reports a non-hex character with its position", () => {
    expect(error(hexToText("48 6g"))).toContain('Unexpected character "g" at position 5');
  });

  it("names control characters by code point instead of printing them", () => {
    expect(error(hexToText("48\u000069"))).toContain("U+0000 at position 3");
  });

  it("rejects an odd number of digits", () => {
    expect(error(hexToText("486"))).toContain("Found 3 hex digits, an odd number");
    expect(error(hexToText("0x5"))).toContain("odd number");
  });

  it("reports the first byte that is not valid UTF-8", () => {
    expect(error(hexToText("48 ff 69"))).toContain("Byte 2 (ff) is not valid UTF-8");
  });

  it("rejects truncated, overlong and surrogate sequences", () => {
    // A three-byte lead with only one continuation byte.
    expect(error(hexToText("41e282"))).toContain("Byte 2 (e2)");
    // "/" written in two bytes instead of one.
    expect(error(hexToText("c0af"))).toContain("Byte 1 (c0)");
    expect(error(hexToText("e08080"))).toContain("Byte 1 (e0)");
    // U+D800 encoded directly, which UTF-8 forbids.
    expect(error(hexToText("eda080"))).toContain("Byte 1 (ed)");
    // Past U+10FFFF.
    expect(error(hexToText("f4908080"))).toContain("Byte 1 (f4)");
    // A continuation byte with no lead.
    expect(error(hexToText("80"))).toContain("Byte 1 (80)");
  });

  it("keeps a leading byte order mark visible", () => {
    expect(value(hexToText("efbbbf41")).text).toBe("﻿A");
  });

  it("round-trips through textToHex in every format", () => {
    const samples = ["Hello, world", "line1\r\nline2\ttab", "Zoë 😀 €", "\u0000\u007f"];
    const formats = ["plain", "spaced", "colon", "c", "escape"] as const;
    for (const sample of samples) {
      for (const format of formats) {
        for (const uppercase of [false, true]) {
          expect(value(hexToText(textToHex(sample, { format, uppercase }))).text).toBe(sample);
        }
      }
    }
  });
});
