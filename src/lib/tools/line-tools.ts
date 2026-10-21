export type LineOrder =
  | "original"
  | "alphabetical"
  | "natural"
  | "codepoint"
  | "length"
  | "reverse";

export type LineOptions = {
  order: LineOrder;
  /** Z→A, 9→1 or longest first. Ignored by "original" and "reverse". */
  descending: boolean;
  /** Keep only the first occurrence of each line. */
  dedupe: boolean;
  /** Compare and deduplicate without regard to letter case. */
  ignoreCase: boolean;
  /** Strip leading and trailing whitespace from every line before anything else. */
  trim: boolean;
  /** Drop lines that are empty or contain only whitespace. */
  removeBlank: boolean;
};

export const DEFAULT_LINE_OPTIONS: LineOptions = {
  order: "alphabetical",
  descending: false,
  dedupe: true,
  ignoreCase: false,
  trim: false,
  removeBlank: false,
};

export type LineResult = {
  output: string;
  inputLines: number;
  outputLines: number;
  duplicatesRemoved: number;
  blankRemoved: number;
};

/** Orders whose direction can be flipped; the others ignore `descending`. */
export function orderHasDirection(order: LineOrder): boolean {
  return order !== "original" && order !== "reverse";
}

/**
 * Splits text into lines, accepting both LF and CRLF. A single trailing line
 * break ends the last line rather than starting an empty one, the way editors
 * and `wc -l` see a file.
 */
export function splitLines(input: string): string[] {
  if (input === "") return [];
  const lines = input.split(/\r?\n/);
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function compareCodepoints(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function comparatorFor(
  order: LineOrder,
  ignoreCase: boolean,
): ((a: string, b: string) => number) | null {
  switch (order) {
    case "alphabetical":
    case "natural": {
      // Pinned to English so the result is the same in every browser; the
      // root collation orders accented Latin letters next to their base letter.
      const collator = new Intl.Collator("en", {
        numeric: order === "natural",
        sensitivity: ignoreCase ? "accent" : "variant",
        caseFirst: ignoreCase ? "false" : "upper",
      });
      return collator.compare;
    }
    case "codepoint":
      return ignoreCase
        ? (a, b) => compareCodepoints(a.toLowerCase(), b.toLowerCase())
        : compareCodepoints;
    case "length":
      return (a, b) => [...a].length - [...b].length;
    default:
      return null;
  }
}

/**
 * Cleans, deduplicates and orders a block of lines. Steps run in a fixed
 * order (trim, drop blanks, dedupe, sort) so that, for example, "a" and "a "
 * count as duplicates once trimming is on. Deduplication keeps the first
 * occurrence, and every sort is stable, so lines that compare equal keep
 * their original relative order.
 */
export function processLines(input: string, options: LineOptions): LineResult {
  const original = splitLines(input);
  let lines = options.trim ? original.map((line) => line.trim()) : original.slice();

  let blankRemoved = 0;
  if (options.removeBlank) {
    const kept = lines.filter((line) => line.trim() !== "");
    blankRemoved = lines.length - kept.length;
    lines = kept;
  }

  let duplicatesRemoved = 0;
  if (options.dedupe) {
    const seen = new Set<string>();
    const kept: string[] = [];
    for (const line of lines) {
      const key = options.ignoreCase ? line.toLowerCase() : line;
      if (seen.has(key)) continue;
      seen.add(key);
      kept.push(line);
    }
    duplicatesRemoved = lines.length - kept.length;
    lines = kept;
  }

  if (options.order === "reverse") {
    lines.reverse();
  } else {
    const compare = comparatorFor(options.order, options.ignoreCase);
    if (compare) {
      const sign = options.descending ? -1 : 1;
      lines.sort((a, b) => sign * compare(a, b));
    }
  }

  const eol = input.includes("\r\n") ? "\r\n" : "\n";
  const trailing = lines.length > 0 && /\r?\n$/.test(input) ? eol : "";

  return {
    output: lines.join(eol) + trailing,
    inputLines: original.length,
    outputLines: lines.length,
    duplicatesRemoved,
    blankRemoved,
  };
}
