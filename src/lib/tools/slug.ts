export type SlugSeparator = "-" | "_" | ".";

export type SlugOptions = {
  separator: SlugSeparator;
  lowercase: boolean;
  /** Longest allowed slug in characters; 0 means no limit. */
  maxLength: number;
};

export const DEFAULT_SLUG_OPTIONS: SlugOptions = {
  separator: "-",
  lowercase: true,
  maxLength: 0,
};

export type SlugResult = {
  slug: string;
  /** Characters that had no ASCII form and were removed, in input order, each once. */
  dropped: string[];
  /** True when `maxLength` shortened the slug. */
  truncated: boolean;
};

/**
 * Letters that Unicode normalization does not reduce to a base letter plus
 * accents, so stripping combining marks alone would delete them. Covers the
 * Latin letters common in European names and titles.
 */
const TRANSLITERATIONS: Record<string, string> = {
  ß: "ss", ẞ: "SS",
  æ: "ae", Æ: "AE",
  œ: "oe", Œ: "OE",
  ø: "o", Ø: "O",
  đ: "d", Đ: "D",
  ð: "d", Ð: "D",
  þ: "th", Þ: "TH",
  ł: "l", Ł: "L",
  ħ: "h", Ħ: "H",
  ı: "i",
  "&": " and ",
};

const TRANSLITERATE = new RegExp(`[${Object.keys(TRANSLITERATIONS).join("")}]`, "g");

/** An apostrophe inside a word is dropped, so "don't" becomes "dont", not "don-t". */
const INNER_APOSTROPHE = /(?<=[\p{L}\p{N}])['’](?=[\p{L}\p{N}])/gu;

const COMBINING_MARKS = /\p{M}/gu;
const NON_ASCII_WORD_CHAR = /[\p{L}\p{N}]/u;

/**
 * Builds a URL slug from one line of text: accents are stripped (é → e),
 * letters without a decomposition are transliterated (ß → ss), and every run
 * of anything other than ASCII letters and digits becomes one separator.
 */
export function slugify(input: string, options: SlugOptions = DEFAULT_SLUG_OPTIONS): SlugResult {
  const { separator, lowercase, maxLength } = options;

  const ascii = input
    .replace(INNER_APOSTROPHE, "")
    .replace(TRANSLITERATE, (ch) => TRANSLITERATIONS[ch])
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "");

  const dropped: string[] = [];
  for (const char of ascii) {
    if (char.charCodeAt(0) > 0x7f && NON_ASCII_WORD_CHAR.test(char) && !dropped.includes(char)) {
      dropped.push(char);
    }
  }

  const words = ascii.split(/[^A-Za-z0-9]+/).filter(Boolean);
  let slug = words.join(separator);
  if (lowercase) slug = slug.toLowerCase();

  let truncated = false;
  if (maxLength > 0 && slug.length > maxLength) {
    truncated = true;
    slug = truncateAtWord(slug, separator, maxLength);
  }

  return { slug, dropped, truncated };
}

/**
 * Cuts at the last separator that fits so no word is split, unless the first
 * word alone is longer than the limit, in which case it is cut mid-word.
 */
function truncateAtWord(slug: string, separator: string, maxLength: number): string {
  const head = slug.slice(0, maxLength + 1);
  const cut = head.lastIndexOf(separator);
  return cut > 0 ? head.slice(0, cut) : slug.slice(0, maxLength);
}

export type SlugLinesResult = {
  /** One slug per input line; blank lines stay blank so rows stay aligned. */
  output: string;
  dropped: string[];
  truncatedLines: number;
};

/** Slugifies every line independently, for turning a list of titles into paths. */
export function slugifyLines(
  input: string,
  options: SlugOptions = DEFAULT_SLUG_OPTIONS,
): SlugLinesResult {
  const dropped: string[] = [];
  let truncatedLines = 0;

  const output = input
    .split(/\r?\n/)
    .map((line) => {
      const result = slugify(line, options);
      if (result.truncated) truncatedLines++;
      for (const char of result.dropped) {
        if (!dropped.includes(char)) dropped.push(char);
      }
      return result.slug;
    })
    .join("\n");

  return { output, dropped, truncatedLines };
}
