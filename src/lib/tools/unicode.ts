export type CharKind =
  | "letter"
  | "mark"
  | "number"
  | "punctuation"
  | "symbol"
  | "space"
  | "control"
  | "format"
  | "private-use"
  | "surrogate"
  | "unassigned";

export type CharInfo = {
  /** The character itself; a lone surrogate is kept as its single code unit. */
  char: string;
  codePoint: number;
  /** `U+` notation with at least four hex digits, e.g. U+200B or U+1F600. */
  label: string;
  /** Offset of the character in UTF-16 code units, which is what String.prototype.indexOf reports. */
  offset: number;
  /** Index of the user-perceived character (grapheme cluster) this code point belongs to. */
  grapheme: number;
  kind: CharKind;
  /** Unicode name for characters that are hard to tell apart by eye; empty for the rest. */
  name: string;
  /** Hex bytes of the UTF-8 encoding, or null for a lone surrogate, which has none. */
  utf8: string | null;
  /** Hex UTF-16 code units, e.g. "D83D DE00". */
  utf16: string;
  /** Escape that works in JavaScript, JSON-compatible for the BMP. */
  escape: string;
  /**
   * True for characters that render as nothing or as an ordinary-looking space:
   * format characters, every space other than U+0020, controls other than tab
   * and line breaks, and lone surrogates. These are the usual culprits when two
   * strings look identical but do not compare equal.
   */
  hidden: boolean;
};

export type UnicodeSummary = {
  graphemes: number;
  codePoints: number;
  utf16Units: number;
  utf8Bytes: number;
  nonAscii: number;
  hidden: number;
  /** Lone surrogates make a string invalid UTF-16; encoders replace them with U+FFFD. */
  loneSurrogates: number;
};

export type UnicodeReport = {
  summary: UnicodeSummary;
  /** One row per code point, capped at `limit`. */
  chars: CharInfo[];
  /** True when the input had more code points than `limit`. */
  truncated: boolean;
};

/** Enough rows to inspect a paragraph in detail without rendering a novel into the DOM. */
export const DEFAULT_ROW_LIMIT = 2000;

/**
 * Names for the characters people come here to find. This is deliberately not
 * the whole Unicode name table: letters and symbols are recognisable on screen,
 * whereas these all look like a space, look like nothing, or change how the
 * text around them renders.
 */
const NAMES: Record<number, string> = {
  0x0000: "NULL",
  0x0009: "CHARACTER TABULATION",
  0x000a: "LINE FEED",
  0x000b: "LINE TABULATION",
  0x000c: "FORM FEED",
  0x000d: "CARRIAGE RETURN",
  0x001b: "ESCAPE",
  0x0020: "SPACE",
  0x007f: "DELETE",
  0x0085: "NEXT LINE",
  0x00a0: "NO-BREAK SPACE",
  0x00ad: "SOFT HYPHEN",
  0x034f: "COMBINING GRAPHEME JOINER",
  0x061c: "ARABIC LETTER MARK",
  0x115f: "HANGUL CHOSEONG FILLER",
  0x1160: "HANGUL JUNGSEONG FILLER",
  0x180e: "MONGOLIAN VOWEL SEPARATOR",
  0x2000: "EN QUAD",
  0x2001: "EM QUAD",
  0x2002: "EN SPACE",
  0x2003: "EM SPACE",
  0x2004: "THREE-PER-EM SPACE",
  0x2005: "FOUR-PER-EM SPACE",
  0x2006: "SIX-PER-EM SPACE",
  0x2007: "FIGURE SPACE",
  0x2008: "PUNCTUATION SPACE",
  0x2009: "THIN SPACE",
  0x200a: "HAIR SPACE",
  0x200b: "ZERO WIDTH SPACE",
  0x200c: "ZERO WIDTH NON-JOINER",
  0x200d: "ZERO WIDTH JOINER",
  0x200e: "LEFT-TO-RIGHT MARK",
  0x200f: "RIGHT-TO-LEFT MARK",
  0x2028: "LINE SEPARATOR",
  0x2029: "PARAGRAPH SEPARATOR",
  0x202a: "LEFT-TO-RIGHT EMBEDDING",
  0x202b: "RIGHT-TO-LEFT EMBEDDING",
  0x202c: "POP DIRECTIONAL FORMATTING",
  0x202d: "LEFT-TO-RIGHT OVERRIDE",
  0x202e: "RIGHT-TO-LEFT OVERRIDE",
  0x202f: "NARROW NO-BREAK SPACE",
  0x205f: "MEDIUM MATHEMATICAL SPACE",
  0x2060: "WORD JOINER",
  0x2061: "FUNCTION APPLICATION",
  0x2062: "INVISIBLE TIMES",
  0x2063: "INVISIBLE SEPARATOR",
  0x2064: "INVISIBLE PLUS",
  0x2066: "LEFT-TO-RIGHT ISOLATE",
  0x2067: "RIGHT-TO-LEFT ISOLATE",
  0x2068: "FIRST STRONG ISOLATE",
  0x2069: "POP DIRECTIONAL ISOLATE",
  0x3000: "IDEOGRAPHIC SPACE",
  0x3164: "HANGUL FILLER",
  0xfe0e: "VARIATION SELECTOR-15",
  0xfe0f: "VARIATION SELECTOR-16",
  0xfeff: "ZERO WIDTH NO-BREAK SPACE",
  0xfffc: "OBJECT REPLACEMENT CHARACTER",
  0xfffd: "REPLACEMENT CHARACTER",
  0x1f3fb: "EMOJI MODIFIER FITZPATRICK TYPE-1-2",
  0x1f3fc: "EMOJI MODIFIER FITZPATRICK TYPE-3",
  0x1f3fd: "EMOJI MODIFIER FITZPATRICK TYPE-4",
  0x1f3fe: "EMOJI MODIFIER FITZPATRICK TYPE-5",
  0x1f3ff: "EMOJI MODIFIER FITZPATRICK TYPE-6",
};

/** Hangul fillers are letters by category but render as blank space. */
const BLANK_LETTERS = new Set([0x115f, 0x1160, 0x3164]);

/** Tab and line breaks are expected in pasted text and never flagged. */
const ORDINARY_CONTROLS = new Set([0x09, 0x0a, 0x0d]);

const KIND_TESTS: [CharKind, RegExp][] = [
  ["letter", /^\p{L}$/u],
  ["mark", /^\p{M}$/u],
  ["number", /^\p{N}$/u],
  ["punctuation", /^\p{P}$/u],
  ["symbol", /^\p{S}$/u],
  ["space", /^\p{Z}$/u],
  ["control", /^\p{Cc}$/u],
  ["format", /^\p{Cf}$/u],
  ["private-use", /^\p{Co}$/u],
];

function isSurrogate(codePoint: number): boolean {
  return codePoint >= 0xd800 && codePoint <= 0xdfff;
}

export function charKind(codePoint: number): CharKind {
  if (isSurrogate(codePoint)) return "surrogate";
  const char = String.fromCodePoint(codePoint);
  for (const [kind, test] of KIND_TESTS) {
    if (test.test(char)) return kind;
  }
  return "unassigned";
}

function hex(n: number, width: number): string {
  return n.toString(16).toUpperCase().padStart(width, "0");
}

export function codePointLabel(codePoint: number): string {
  return `U+${hex(codePoint, 4)}`;
}

/** UTF-8 bytes for a scalar value; lone surrogates have no UTF-8 form. */
export function utf8Bytes(codePoint: number): number[] | null {
  if (isSurrogate(codePoint)) return null;
  if (codePoint < 0x80) return [codePoint];
  if (codePoint < 0x800) return [0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f)];
  if (codePoint < 0x10000) {
    return [
      0xe0 | (codePoint >> 12),
      0x80 | ((codePoint >> 6) & 0x3f),
      0x80 | (codePoint & 0x3f),
    ];
  }
  return [
    0xf0 | (codePoint >> 18),
    0x80 | ((codePoint >> 12) & 0x3f),
    0x80 | ((codePoint >> 6) & 0x3f),
    0x80 | (codePoint & 0x3f),
  ];
}

export function jsEscape(codePoint: number): string {
  return codePoint > 0xffff ? `\\u{${hex(codePoint, 1)}}` : `\\u${hex(codePoint, 4)}`;
}

function isHidden(codePoint: number, kind: CharKind): boolean {
  switch (kind) {
    case "format":
    case "surrogate":
      return true;
    case "space":
      return codePoint !== 0x20;
    case "control":
      return !ORDINARY_CONTROLS.has(codePoint);
    case "letter":
      return BLANK_LETTERS.has(codePoint);
    default:
      return false;
  }
}

export function describeChar(char: string, offset = 0, grapheme = 0): CharInfo {
  const codePoint = char.codePointAt(0) ?? 0;
  const kind = charKind(codePoint);
  const bytes = utf8Bytes(codePoint);
  const units = Array.from({ length: char.length }, (_, i) => hex(char.charCodeAt(i), 4));
  return {
    char,
    codePoint,
    label: codePointLabel(codePoint),
    offset,
    grapheme,
    kind,
    name: NAMES[codePoint] ?? "",
    utf8: bytes ? bytes.map((b) => hex(b, 2)).join(" ") : null,
    utf16: units.join(" "),
    escape: units.length === 2 ? jsEscape(codePoint) : `\\u${units[0]}`,
    hidden: isHidden(codePoint, kind),
  };
}

/**
 * Start offsets (in UTF-16 units) of each grapheme cluster. Falls back to one
 * cluster per code point where Intl.Segmenter is unavailable.
 */
function graphemeStarts(input: string): number[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(input), (s) => s.index);
  }
  const starts: number[] = [];
  let offset = 0;
  for (const char of input) {
    starts.push(offset);
    offset += char.length;
  }
  return starts;
}

/**
 * Breaks text into code points with their encodings, category and, for the
 * characters that are easy to miss, their Unicode name. Iteration is by code
 * point, so a lone surrogate shows up as its own row instead of being dropped.
 */
export function inspectUnicode(input: string, limit = DEFAULT_ROW_LIMIT): UnicodeReport {
  const starts = graphemeStarts(input);
  const chars: CharInfo[] = [];
  const summary: UnicodeSummary = {
    graphemes: starts.length,
    codePoints: 0,
    utf16Units: input.length,
    utf8Bytes: 0,
    nonAscii: 0,
    hidden: 0,
    loneSurrogates: 0,
  };

  let offset = 0;
  let grapheme = -1;
  for (const char of input) {
    while (grapheme + 1 < starts.length && starts[grapheme + 1] <= offset) grapheme++;
    const info = describeChar(char, offset, Math.max(grapheme, 0));

    summary.codePoints++;
    // Lone surrogates count as the three bytes of U+FFFD, which is what TextEncoder emits.
    summary.utf8Bytes += info.utf8 === null ? 3 : info.utf8.split(" ").length;
    if (info.codePoint > 0x7f) summary.nonAscii++;
    if (info.hidden) summary.hidden++;
    if (info.kind === "surrogate") summary.loneSurrogates++;
    if (chars.length < limit) chars.push(info);

    offset += char.length;
  }

  return { summary, chars, truncated: summary.codePoints > chars.length };
}
