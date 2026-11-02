import { err, messageOf, ok, type ToolResult } from "./result";

export type DotenvDirection = "env-to-json" | "json-to-env";

export type DotenvEntry = {
  key: string;
  value: string;
  /** 1-based line the assignment starts on. */
  line: number;
};

export type DotenvConversion = {
  output: string;
  /** Things that converted but are worth knowing, e.g. a key defined twice. */
  warnings: string[];
};

/** Key characters accepted by the common dotenv parsers (letters, digits, `_`, `.`, `-`). */
const KEY = /^[\w.-]+$/;
const ASSIGNMENT = /^(?:export[ \t]+)?([^=\s]+)[ \t]*=[ \t]*/;

/** Escapes recognised inside double quotes; anything else keeps its backslash. */
const ESCAPES: Record<string, string> = {
  n: "\n",
  r: "\r",
  t: "\t",
  '"': '"',
  "\\": "\\",
};

function unescapeDouble(raw: string): string {
  return raw.replace(/\\(.)/gs, (match, ch: string) => ESCAPES[ch] ?? match);
}

/**
 * Finds the closing quote for a value that opens at `start` in `text`. Double
 * quotes honour backslash escapes; single quotes and backticks are literal.
 * Returns the index of the closing quote, or -1 if the value never closes.
 */
function findClosingQuote(text: string, start: number, quote: string): number {
  for (let i = start + 1; i < text.length; i++) {
    const ch = text[i];
    if (quote === '"' && ch === "\\") {
      i++;
      continue;
    }
    if (ch === quote) return i;
  }
  return -1;
}

/**
 * Parses a `.env` file the way dotenv, Docker Compose and python-dotenv agree
 * on: `KEY=value` lines with an optional `export` prefix, `#` comments, single
 * quotes taken literally, double quotes with `\n`-style escapes, and quoted
 * values that may span several lines. A duplicated key keeps its last value.
 * `${VAR}` references are returned as written, since expansion depends on the
 * loader and the environment it runs in.
 */
export function parseDotenv(
  input: string,
): ToolResult<{ entries: DotenvEntry[]; warnings: string[] }> {
  const text = input.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const entries: DotenvEntry[] = [];
  const warnings: string[] = [];
  const firstLine = new Map<string, number>();

  // Line starts, so an offset in `text` can be reported as a line number.
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") lineStarts.push(i + 1);
  }

  let line = 0;
  while (line < lineStarts.length) {
    const start = lineStarts[line];
    const end = line + 1 < lineStarts.length ? lineStarts[line + 1] - 1 : text.length;
    const lineNumber = line + 1;
    const raw = text.slice(start, end);
    const trimmed = raw.trim();
    line++;

    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = ASSIGNMENT.exec(trimmed);
    if (!match) {
      return err(`Line ${lineNumber}: expected KEY=value, got "${truncate(trimmed)}".`);
    }
    const key = match[1];
    if (!KEY.test(key)) {
      return err(
        `Line ${lineNumber}: "${truncate(key)}" is not a valid key. Use letters, digits, underscores, dots or hyphens.`,
      );
    }

    // Offset of the value within `text`, so quoted values can run past this line.
    const valueStart = start + (raw.length - raw.trimStart().length) + match[0].length;
    const quote = text[valueStart];
    let value: string;

    if (quote === '"' || quote === "'" || quote === "`") {
      const close = findClosingQuote(text, valueStart, quote);
      if (close === -1) {
        return err(`Line ${lineNumber}: the ${quote}-quoted value for ${key} is never closed.`);
      }
      const inner = text.slice(valueStart + 1, close);
      value = quote === '"' ? unescapeDouble(inner) : inner;

      // Resume after the line holding the closing quote, which must end in
      // nothing but whitespace or a comment.
      const closeLine = lineIndexOf(lineStarts, close);
      const closeLineEnd =
        closeLine + 1 < lineStarts.length ? lineStarts[closeLine + 1] - 1 : text.length;
      const rest = text.slice(close + 1, closeLineEnd).trim();
      if (rest && !rest.startsWith("#")) {
        return err(
          `Line ${closeLine + 1}: unexpected text after the closing quote for ${key}: "${truncate(rest)}".`,
        );
      }
      line = closeLine + 1;
    } else {
      // Unquoted: a `#` starts a comment at the beginning of the value or
      // after whitespace, so values such as `v1#beta` or URL fragments
      // survive intact. A value that starts with `#` must be quoted.
      value = text.slice(valueStart, end).replace(/(^|[ \t])#.*$/, "").trimEnd();
    }

    const seen = firstLine.get(key);
    if (seen === undefined) {
      firstLine.set(key, lineNumber);
    } else {
      warnings.push(
        `${key} is defined on line ${seen} and again on line ${lineNumber}; the last value wins.`,
      );
    }
    entries.push({ key, value, line: lineNumber });
  }

  return ok({ entries, warnings });
}

function lineIndexOf(lineStarts: number[], offset: number): number {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function truncate(s: string, max = 40): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export function dotenvToJson(input: string, indent = 2): ToolResult<DotenvConversion> {
  if (!input.trim()) return ok({ output: "", warnings: [] });

  const parsed = parseDotenv(input);
  if (!parsed.ok) return parsed;

  const object: Record<string, string> = {};
  for (const { key, value } of parsed.value.entries) object[key] = value;

  return ok({
    output: JSON.stringify(object, null, indent),
    warnings: parsed.value.warnings,
  });
}

/** Characters that never need quoting in any dotenv dialect. */
const PLAIN_VALUE = /^[\w./:@%+,=-]*$/;

/**
 * Quotes a value so every common loader reads it back unchanged: bare when it
 * is plain, single quotes (literal everywhere) when that suffices, and double
 * quotes with escapes only for newlines or values containing a single quote.
 */
export function formatDotenvValue(value: string): string {
  if (PLAIN_VALUE.test(value)) return value;
  if (!/[\n\r']/.test(value)) return `'${value}'`;
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
  return `"${escaped}"`;
}

/**
 * Turns a flat JSON object into `.env` lines. Strings, numbers and booleans
 * become values and `null` becomes an empty value; nested objects and arrays
 * are rejected because a `.env` file has no way to represent them.
 */
export function jsonToDotenv(input: string): ToolResult<DotenvConversion> {
  if (!input.trim()) return ok({ output: "", warnings: [] });

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (e) {
    return err(messageOf(e, "Invalid JSON."));
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return err('Expected a JSON object of key/value pairs, such as {"PORT": 3000}.');
  }

  const lines: string[] = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (!KEY.test(key)) {
      return err(
        `"${truncate(key)}" is not a valid .env key. Use letters, digits, underscores, dots or hyphens.`,
      );
    }
    if (value !== null && typeof value === "object") {
      return err(
        `${key} is ${Array.isArray(value) ? "an array" : "an object"}; .env values must be strings, numbers or booleans.`,
      );
    }
    lines.push(`${key}=${value === null ? "" : formatDotenvValue(String(value))}`);
  }

  return ok({ output: lines.length ? `${lines.join("\n")}\n` : "", warnings: [] });
}

export function convertDotenv(
  input: string,
  direction: DotenvDirection,
): ToolResult<DotenvConversion> {
  return direction === "env-to-json" ? dotenvToJson(input) : jsonToDotenv(input);
}
