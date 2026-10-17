import { err, messageOf, ok, type ToolResult } from "./result";

export type CsvDelimiter = "," | ";" | "\t";

export type CsvDirection = "csv-to-json" | "json-to-csv";

export type CsvOptions = {
  delimiter: CsvDelimiter;
  /** Treat the first row as column names and emit an array of objects. */
  header: boolean;
};

export const DEFAULT_CSV_OPTIONS: CsvOptions = { delimiter: ",", header: true };

/**
 * Parses CSV following RFC 4180: fields may be wrapped in double quotes, a
 * quoted field may contain the delimiter, newlines and doubled quotes (`""`),
 * and rows may end in LF or CRLF. Every value stays a string — guessing types
 * would silently turn ZIP codes and IDs with leading zeros into numbers.
 */
export function parseCsv(
  input: string,
  delimiter: CsvDelimiter = ",",
): ToolResult<string[][]> {
  // A UTF-8 byte-order mark is common in spreadsheet exports and would
  // otherwise end up glued to the first column name.
  const text = input.startsWith("﻿") ? input.slice(1) : input;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  // True once the current field started with a quote, so text after its
  // closing quote can be reported instead of silently merged.
  let wasQuoted = false;
  let line = 1;
  let quoteLine = 1;

  const endField = () => {
    row.push(field);
    field = "";
    wasQuoted = false;
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        if (ch === "\n") line++;
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      if (field === "" && !wasQuoted) {
        quoted = true;
        wasQuoted = true;
        quoteLine = line;
        continue;
      }
      return err(
        `Unexpected quote on line ${line}. Wrap the whole field in quotes and double any quotes inside it ("").`,
      );
    }

    if (wasQuoted && ch !== delimiter && ch !== "\n" && ch !== "\r") {
      return err(
        `Unexpected text after a closing quote on line ${line}. A quoted field must end at the delimiter or the end of the line.`,
      );
    }

    if (ch === delimiter) {
      endField();
    } else if (ch === "\r" && text[i + 1] === "\n") {
      // CRLF: let the LF branch end the row on the next iteration.
    } else if (ch === "\n") {
      endRow();
      line++;
    } else {
      field += ch;
    }
  }

  if (quoted) {
    return err(`Unterminated quoted field starting on line ${quoteLine}.`);
  }

  // A trailing newline ends the last row; it does not start an empty one.
  if (field !== "" || wasQuoted || row.length > 0) endRow();

  return ok(rows);
}

/**
 * An empty line parses as one empty field. With more than one column it can
 * only be a stray blank line; with a single column it is a real empty value.
 */
function isBlankRow(row: string[]): boolean {
  return row.length === 1 && row[0] === "";
}

export function csvToJson(
  input: string,
  options: CsvOptions = DEFAULT_CSV_OPTIONS,
  indent = 2,
): ToolResult<string> {
  if (!input.trim()) return ok("");

  const parsed = parseCsv(input, options.delimiter);
  if (!parsed.ok) return parsed;
  const rows = parsed.value;

  if (!options.header) {
    const width = Math.max(...rows.map((r) => r.length));
    const kept = width > 1 ? rows.filter((r) => !isBlankRow(r)) : rows;
    return ok(JSON.stringify(kept, null, indent));
  }

  const [columns, ...records] = rows;
  const seen = new Set<string>();
  for (const name of columns) {
    if (seen.has(name)) {
      return err(
        `Duplicate column name "${name}" in the header row. Rename it, or turn off "First row is a header" to get arrays instead.`,
      );
    }
    seen.add(name);
  }

  const objects: Record<string, string>[] = [];
  for (let r = 0; r < records.length; r++) {
    const record = records[r];
    if (columns.length > 1 && isBlankRow(record)) continue;
    if (record.length !== columns.length) {
      return err(
        `Row ${r + 2} has ${record.length} field${record.length === 1 ? "" : "s"}, but the header has ${columns.length}.`,
      );
    }
    const obj: Record<string, string> = {};
    columns.forEach((name, c) => {
      obj[name] = record[c];
    });
    objects.push(obj);
  }

  return ok(JSON.stringify(objects, null, indent));
}

/** Quotes a field only when it would otherwise be misread. */
function escapeField(value: string, delimiter: CsvDelimiter): string {
  const needsQuotes =
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r");
  return needsQuotes ? `"${value.replace(/"/g, '""')}"` : value;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  // Nested objects and arrays have no CSV equivalent; keep them as JSON so
  // the data survives the trip instead of becoming "[object Object]".
  return JSON.stringify(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Accepts an array of objects (columns are the union of keys, in first-seen
 * order) or an array of arrays (written as-is, no header row).
 */
export function jsonToCsv(
  input: string,
  delimiter: CsvDelimiter = ",",
): ToolResult<string> {
  if (!input.trim()) return ok("");

  let data: unknown;
  try {
    data = JSON.parse(input);
  } catch (e) {
    return err(messageOf(e, "Invalid JSON."));
  }

  if (!Array.isArray(data)) {
    return err(
      "Expected a JSON array: either an array of objects or an array of arrays.",
    );
  }
  if (data.length === 0) return ok("");

  const line = (cells: unknown[]) =>
    cells.map((c) => escapeField(cellText(c), delimiter)).join(delimiter);

  if (data.every(Array.isArray)) {
    return ok(data.map((row: unknown[]) => line(row)).join("\n"));
  }

  if (data.every(isPlainObject)) {
    const columns: string[] = [];
    const seen = new Set<string>();
    for (const obj of data) {
      for (const key of Object.keys(obj)) {
        if (!seen.has(key)) {
          seen.add(key);
          columns.push(key);
        }
      }
    }
    const lines = [line(columns)];
    for (const obj of data) lines.push(line(columns.map((k) => obj[k])));
    return ok(lines.join("\n"));
  }

  return err(
    "Every item in the array must be the same kind: all objects or all arrays.",
  );
}

export function convertCsv(
  input: string,
  direction: CsvDirection,
  options: CsvOptions = DEFAULT_CSV_OPTIONS,
): ToolResult<string> {
  return direction === "csv-to-json"
    ? csvToJson(input, options)
    : jsonToCsv(input, options.delimiter);
}
