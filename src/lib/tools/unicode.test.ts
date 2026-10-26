import { describe, expect, it } from "vitest";
import {
  charKind,
  codePointLabel,
  describeChar,
  inspectUnicode,
  jsEscape,
  utf8Bytes,
} from "./unicode";

describe("codePointLabel", () => {
  it("pads to four hex digits and keeps longer values whole", () => {
    expect(codePointLabel(0x41)).toBe("U+0041");
    expect(codePointLabel(0x200b)).toBe("U+200B");
    expect(codePointLabel(0x1f600)).toBe("U+1F600");
  });
});

describe("utf8Bytes", () => {
  it("matches TextEncoder at every length boundary", () => {
    const encoder = new TextEncoder();
    for (const cp of [0x00, 0x7f, 0x80, 0x7ff, 0x800, 0xffff, 0x10000, 0x10ffff, 0xe9, 0x20ac, 0x1f600]) {
      expect(utf8Bytes(cp), codePointLabel(cp)).toEqual(Array.from(encoder.encode(String.fromCodePoint(cp))));
    }
  });

  it("has no encoding for a lone surrogate", () => {
    expect(utf8Bytes(0xd800)).toBeNull();
    expect(utf8Bytes(0xdfff)).toBeNull();
  });
});

describe("jsEscape", () => {
  it("uses \\uXXXX in the BMP and braces above it", () => {
    expect(jsEscape(0xe9)).toBe("\\u00E9");
    expect(jsEscape(0x1f600)).toBe("\\u{1F600}");
  });
});

describe("charKind", () => {
  it.each([
    [0x41, "letter"],
    [0x0301, "mark"],
    [0x37, "number"],
    [0x2c, "punctuation"],
    [0x2b, "symbol"],
    [0x20, "space"],
    [0x00a0, "space"],
    [0x0a, "control"],
    [0x200b, "format"],
    [0xe000, "private-use"],
    [0xd83d, "surrogate"],
    [0x0378, "unassigned"],
  ] as const)("classifies %s as %s", (cp, kind) => {
    expect(charKind(cp)).toBe(kind);
  });
});

describe("describeChar", () => {
  it("describes an astral emoji with both encodings", () => {
    const info = describeChar("😀");
    expect(info).toMatchObject({
      codePoint: 0x1f600,
      label: "U+1F600",
      kind: "symbol",
      utf8: "F0 9F 98 80",
      utf16: "D83D DE00",
      escape: "\\u{1F600}",
      hidden: false,
      name: "",
    });
  });

  it("names and flags characters that look like nothing or like a space", () => {
    for (const [char, name] of [
      ["​", "ZERO WIDTH SPACE"],
      [" ", "NO-BREAK SPACE"],
      ["﻿", "ZERO WIDTH NO-BREAK SPACE"],
      ["‮", "RIGHT-TO-LEFT OVERRIDE"],
      ["ㅤ", "HANGUL FILLER"],
      ["\u0000", "NULL"],
    ]) {
      const info = describeChar(char);
      expect(info.name).toBe(name);
      expect(info.hidden, name).toBe(true);
    }
  });

  it("does not flag the ordinary space, tab or line breaks", () => {
    for (const char of [" ", "\t", "\n", "\r"]) {
      const info = describeChar(char);
      expect(info.hidden, info.label).toBe(false);
      expect(info.name).not.toBe("");
    }
  });

  it("keeps a lone surrogate as a row of its own", () => {
    const info = describeChar("\uD800");
    expect(info).toMatchObject({ kind: "surrogate", utf8: null, utf16: "D800", escape: "\\uD800", hidden: true });
  });
});

describe("inspectUnicode", () => {
  it("returns an empty report for empty input", () => {
    const report = inspectUnicode("");
    expect(report.chars).toEqual([]);
    expect(report.truncated).toBe(false);
    expect(report.summary).toEqual({
      graphemes: 0,
      codePoints: 0,
      utf16Units: 0,
      utf8Bytes: 0,
      nonAscii: 0,
      hidden: 0,
      loneSurrogates: 0,
    });
  });

  it("finds the zero-width space hiding in an identifier", () => {
    const report = inspectUnicode("user​id");
    expect(report.summary).toMatchObject({ codePoints: 7, utf16Units: 7, utf8Bytes: 9, nonAscii: 1, hidden: 1 });
    const hidden = report.chars.filter((c) => c.hidden);
    expect(hidden).toHaveLength(1);
    expect(hidden[0]).toMatchObject({ label: "U+200B", offset: 4 });
  });

  it("counts graphemes, code points, UTF-16 units and UTF-8 bytes separately", () => {
    // é as e + combining acute, then a family emoji joined with ZWJ.
    const text = "é👨‍👩‍👧";
    const { summary, chars } = inspectUnicode(text);
    expect(summary.graphemes).toBe(2);
    expect(summary.codePoints).toBe(7);
    expect(summary.utf16Units).toBe(text.length);
    expect(summary.utf8Bytes).toBe(new TextEncoder().encode(text).length);
    expect(chars.map((c) => c.grapheme)).toEqual([0, 0, 1, 1, 1, 1, 1]);
    expect(chars.map((c) => c.offset)).toEqual([0, 1, 2, 4, 5, 7, 8]);
  });

  it("counts a lone surrogate as the replacement character TextEncoder writes", () => {
    const text = "a\uD800b";
    const { summary } = inspectUnicode(text);
    expect(summary.loneSurrogates).toBe(1);
    expect(summary.utf8Bytes).toBe(new TextEncoder().encode(text).length);
  });

  it("caps the rows but still summarises the whole input", () => {
    const report = inspectUnicode("abcdef", 4);
    expect(report.chars.map((c) => c.char)).toEqual(["a", "b", "c", "d"]);
    expect(report.truncated).toBe(true);
    expect(report.summary.codePoints).toBe(6);
  });
});
