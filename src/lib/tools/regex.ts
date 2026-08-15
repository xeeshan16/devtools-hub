import { err, messageOf, ok, type ToolResult } from "./result";

export type RegexFlag = "g" | "i" | "m" | "s" | "u" | "y";

export const REGEX_FLAGS: { flag: RegexFlag; name: string; description: string }[] =
  [
    { flag: "g", name: "global", description: "Find all matches, not just the first" },
    { flag: "i", name: "ignore case", description: "Case-insensitive matching" },
    { flag: "m", name: "multiline", description: "^ and $ match at line breaks" },
    { flag: "s", name: "dot all", description: ". also matches newlines" },
    { flag: "u", name: "unicode", description: "Full Unicode and \\p{...} support" },
    { flag: "y", name: "sticky", description: "Match only from lastIndex" },
  ];

export type RegexMatch = {
  index: number;
  length: number;
  value: string;
  groups: { name: string; value: string | undefined }[];
};

export type RegexReport = {
  matches: RegexMatch[];
  /** Alternating plain/matched segments, ready to render without re-scanning. */
  segments: { text: string; matched: boolean }[];
  replaced?: string;
};

/** Hard ceiling so a catastrophic pattern can't lock the tab up indefinitely. */
const MAX_MATCHES = 5000;

export function buildRegex(
  pattern: string,
  flags: string,
): ToolResult<RegExp> {
  if (!pattern) return err("Enter a regular expression.");
  try {
    return ok(new RegExp(pattern, flags));
  } catch (e) {
    return err(messageOf(e, "Invalid regular expression."));
  }
}

export function runRegex(
  pattern: string,
  flags: string,
  input: string,
  replacement?: string,
): ToolResult<RegexReport> {
  const built = buildRegex(pattern, flags);
  if (!built.ok) return err(built.error);

  // Matching always needs `g` to walk the whole input; the user's choice of `g`
  // is honoured separately by truncating to the first match below.
  const global = flags.includes("g");
  const scanner = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");

  const matches: RegexMatch[] = [];
  let match: RegExpExecArray | null;
  let guard = 0;

  while ((match = scanner.exec(input)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      value: match[0],
      groups: [
        ...match.slice(1).map((value, i) => ({ name: String(i + 1), value })),
        ...Object.entries(match.groups ?? {}).map(([name, value]) => ({
          name,
          value,
        })),
      ],
    });

    // A zero-length match would otherwise spin forever on the same index.
    if (match[0] === "") scanner.lastIndex += 1;
    if (!global) break;
    if (++guard >= MAX_MATCHES) break;
  }

  const segments: { text: string; matched: boolean }[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.index > cursor) {
      segments.push({ text: input.slice(cursor, m.index), matched: false });
    }
    if (m.length > 0) {
      segments.push({ text: m.value, matched: true });
    }
    cursor = m.index + m.length;
  }
  if (cursor < input.length) {
    segments.push({ text: input.slice(cursor), matched: false });
  }

  const report: RegexReport = { matches, segments };

  if (replacement !== undefined) {
    try {
      report.replaced = input.replace(built.value, replacement);
    } catch (e) {
      return err(messageOf(e, "Replacement failed."));
    }
  }

  return ok(report);
}
