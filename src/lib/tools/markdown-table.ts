import { parseCsv, type CsvDelimiter } from "./csv-json";
import { ok, type ToolResult } from "./result";

export type TableAlignment = "none" | "left" | "center" | "right";

export type TableDelimiter = "auto" | CsvDelimiter;

export type MarkdownTableOptions = {
  /** `auto` picks tab, semicolon or comma from the first line. */
  delimiter: TableDelimiter;
  alignment: TableAlignment;
  /** Pad cells so the columns line up in the raw Markdown. */
  pretty: boolean;
};

export const DEFAULT_MARKDOWN_TABLE_OPTIONS: MarkdownTableOptions = {
  delimiter: "auto",
  alignment: "none",
  pretty: true,
};

/**
 * Guesses the delimiter from the first line, ignoring anything inside double
 * quotes. A tab wins outright because cells copied from a spreadsheet are
 * tab-separated and rarely contain tabs themselves; otherwise the more
 * frequent of semicolon and comma wins, with comma as the default.
 */
export function detectDelimiter(input: string): CsvDelimiter {
  let tabs = 0;
  let semicolons = 0;
  let commas = 0;
  let quoted = false;
  for (const ch of input) {
    if (ch === '"') quoted = !quoted;
    else if (quoted) continue;
    else if (ch === "\n") break;
    else if (ch === "\t") tabs++;
    else if (ch === ";") semicolons++;
    else if (ch === ",") commas++;
  }
  if (tabs > 0) return "\t";
  return semicolons > commas ? ";" : ",";
}

/**
 * Makes a value safe inside a GitHub-flavoured Markdown table cell: a pipe
 * would end the cell and a line break would end the row, so pipes are
 * backslash-escaped and line breaks become `<br>`, which GFM renders.
 */
export function escapeCell(value: string): string {
  return value
    .trim()
    .replace(/\|/g, "\\|")
    .replace(/\r\n|\r|\n/g, "<br>");
}

/** Width in code points, so an emoji or accented letter counts once. */
function width(text: string): number {
  return [...text].length;
}

function pad(text: string, size: number, alignment: TableAlignment): string {
  const gap = size - width(text);
  if (gap <= 0) return text;
  if (alignment === "right") return " ".repeat(gap) + text;
  if (alignment === "center") {
    const left = Math.floor(gap / 2);
    return " ".repeat(left) + text + " ".repeat(gap - left);
  }
  return text + " ".repeat(gap);
}

function separator(size: number, alignment: TableAlignment): string {
  switch (alignment) {
    case "left":
      return ":" + "-".repeat(size - 1);
    case "center":
      return ":" + "-".repeat(size - 2) + ":";
    case "right":
      return "-".repeat(size - 1) + ":";
    default:
      return "-".repeat(size);
  }
}

/**
 * Converts CSV or TSV (for example cells pasted from a spreadsheet) into a
 * GFM table. The first row is the header. Rows shorter than the widest row
 * are padded with empty cells so every row has the same column count, which
 * GFM requires of the header and delimiter rows; blank lines are skipped.
 */
export function toMarkdownTable(
  input: string,
  options: MarkdownTableOptions = DEFAULT_MARKDOWN_TABLE_OPTIONS,
): ToolResult<string> {
  if (!input.trim()) return ok("");

  const delimiter =
    options.delimiter === "auto" ? detectDelimiter(input) : options.delimiter;
  const parsed = parseCsv(input, delimiter);
  if (!parsed.ok) return parsed;

  const rows = parsed.value
    .filter((row) => !(row.length === 1 && row[0].trim() === ""))
    .map((row) => row.map(escapeCell));
  if (rows.length === 0) return ok("");

  const columns = Math.max(...rows.map((row) => row.length));
  for (const row of rows) {
    while (row.length < columns) row.push("");
  }

  // The delimiter row needs at least three characters so every alignment
  // marker (`:-:` is the longest) fits.
  const widths = Array.from({ length: columns }, (_, c) =>
    options.pretty ? Math.max(3, ...rows.map((row) => width(row[c]))) : 3,
  );

  // Unaligned columns render left-aligned, so pad them that way too.
  const cellAlignment = options.alignment === "none" ? "left" : options.alignment;
  const line = (cells: string[]) => "| " + cells.join(" | ") + " |";
  const formatRow = (row: string[]) =>
    line(
      options.pretty
        ? row.map((cell, c) => pad(cell, widths[c], cellAlignment))
        : row,
    );

  const [header, ...body] = rows;
  const lines = [
    formatRow(header),
    line(widths.map((size) => separator(size, options.alignment))),
    ...body.map(formatRow),
  ];
  return ok(lines.join("\n"));
}
