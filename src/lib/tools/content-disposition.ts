import { decodeExtValue } from "./link-header";
import { err, ok, type ToolResult } from "./result";

/** One parameter of the header, in the order it was written. */
export type DispositionParam = {
  /** Parameter name, lowercased; parameter names are case-insensitive. */
  name: string;
  /** The value with quotes and escapes removed, or null when the parameter has no value. */
  value: string | null;
};

export type ContentDispositionResult = {
  /** The disposition type, lowercased: usually inline, attachment or form-data. */
  type: string;
  /** False for types other than inline, attachment and form-data; browsers treat those as attachment. */
  knownType: boolean;
  /** Plain-language meaning of the disposition type. */
  meaning: string;
  /** The file name a client should use: the decoded filename* when it is valid, otherwise filename. */
  filename: string | null;
  /** Which parameter `filename` came from. */
  filenameSource: "filename*" | "filename" | null;
  /** The plain filename parameter, kept as the fallback for clients that don't understand filename*. */
  fallbackFilename: string | null;
  /** Charset and language of a valid filename* value. */
  extended: { charset: string; language: string } | null;
  /** The form field name of a multipart/form-data part. */
  name: string | null;
  /** The name a browser would save the file under: directories, control characters and reserved characters removed. */
  savedAs: string | null;
  params: DispositionParam[];
  warnings: string[];
};

const PREFIX = /^(?:[<>]\s*)?content-disposition\s*:\s*/i;
const EXAMPLE = 'attachment; filename="report.pdf"';
const TOKEN = /^[!#$%&'*+\-.^_`|~\dA-Za-z]+$/;

const TYPES: Record<string, string> = {
  inline: "Display the content in the browser window, e.g. show a PDF or image instead of downloading it.",
  attachment: "Download the content and save it as a file instead of displaying it.",
  "form-data": "One part of a multipart/form-data body, as sent by an HTML form; name says which field it is.",
};

/**
 * Parses a `Content-Disposition` header (optionally prefixed with the header
 * name or curl -v markers) following RFC 6266: a disposition type followed by
 * semicolon-separated parameters whose values are tokens or quoted strings.
 * `filename*` uses the RFC 8187 encoding (`UTF-8''caf%C3%A9.pdf`) and, when
 * valid, takes precedence over `filename`, as it does in browsers.
 */
export function parseContentDisposition(input: string): ToolResult<ContentDispositionResult | null> {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim().replace(PREFIX, ""))
    .filter((line) => line !== "");
  if (lines.length === 0) return ok(null);

  const warnings: string[] = [];
  if (lines.length > 1) {
    warnings.push("Only the first line was parsed: a response has a single Content-Disposition header, and it is not a comma-separated list.");
  }
  const header = lines[0];

  const firstSemicolon = nextSemicolon(header, 0);
  const rawType = header.slice(0, firstSemicolon).trim();
  if (rawType === "") return err(`The header must start with a disposition type, e.g. ${EXAMPLE}.`);
  if (/^[^\s=]+\s+\S/.test(rawType)) {
    return err(`"${rawType}" is missing a semicolon after the disposition type, e.g. ${EXAMPLE}.`);
  }
  if (rawType.includes("=")) {
    return err(`"${rawType}" is a parameter, not a disposition type. Start with inline or attachment, e.g. ${EXAMPLE}.`);
  }
  if (!TOKEN.test(rawType)) return err(`"${rawType}" is not a valid disposition type. Use inline or attachment, e.g. ${EXAMPLE}.`);

  const type = rawType.toLowerCase();
  const params = readParams(header, firstSemicolon, warnings);

  const first = new Map<string, string | null>();
  for (const { name, value } of params) {
    if (first.has(name)) {
      warnings.push(`The ${name} parameter appears more than once; RFC 6266 forbids this and clients disagree on which one wins.`);
      continue;
    }
    first.set(name, value);
  }

  const knownType = type in TYPES;
  if (!knownType) {
    warnings.push(`"${type}" is not a registered disposition type; browsers treat unknown types as attachment.`);
  }

  const fallbackFilename = first.get("filename") ?? null;
  let filename = fallbackFilename;
  let filenameSource: ContentDispositionResult["filenameSource"] = fallbackFilename !== null ? "filename" : null;
  let extended: ContentDispositionResult["extended"] = null;

  if (first.has("filename*")) {
    const raw = first.get("filename*") ?? "";
    if (params.some((param) => param.name === "filename*" && param.quoted)) {
      warnings.push('filename* must not be in double quotes; write filename*=UTF-8\'\'name.pdf without them. Some browsers ignore a quoted value.');
    }
    const match = /^([^']*)'([^']*)'(.*)$/.exec(raw);
    const decoded = match ? decodeExtValue(raw) : null;
    if (!match) {
      warnings.push("filename* isn't in the charset'language'value form, e.g. filename*=UTF-8''r%C3%A9sum%C3%A9.pdf, so clients ignore it.");
    } else if (decoded === null) {
      const charset = match[1].toLowerCase();
      warnings.push(
        charset === "utf-8" || charset === "iso-8859-1"
          ? "filename* has invalid percent-encoding, so clients ignore it."
          : `filename* uses the charset "${match[1] || "(empty)"}"; only UTF-8 (and ISO-8859-1) are supported, so clients ignore it.`,
      );
    } else {
      filename = decoded;
      filenameSource = "filename*";
      extended = { charset: match[1].toUpperCase(), language: match[2] };
      if (match[1].toLowerCase() === "iso-8859-1") warnings.push("filename* uses ISO-8859-1; prefer UTF-8, the only charset browsers must support.");
    }
    if (fallbackFilename === null) {
      warnings.push("There is no plain filename fallback; old clients that don't understand filename* will use a name of their own.");
    }
  }

  if (fallbackFilename !== null) {
    if (/[^\x20-\x7e]/.test(fallbackFilename)) {
      warnings.push("filename contains non-ASCII characters, which browsers decode inconsistently; send an ASCII filename plus filename* for the exact name.");
    }
    if (/%[\da-f]{2}/i.test(fallbackFilename) && filenameSource !== "filename*") {
      warnings.push("filename looks percent-encoded; percent-encoding only works in filename*, so some clients will save the name with the % sequences in it.");
    }
  }

  if (filename !== null) {
    if (filename.trim() === "") warnings.push("The file name is empty, so the client will choose its own name.");
    if (/[/\\]/.test(filename)) warnings.push("The file name contains a / or \\; clients drop the directory part and keep only the last segment.");
  }

  const name = first.get("name") ?? null;
  if (type === "form-data" && name === null) {
    warnings.push("A form-data part must have a name parameter saying which form field it is (RFC 7578).");
  }
  return ok({
    type,
    knownType,
    meaning: TYPES[type] ?? "Not a registered disposition type; browsers handle it like attachment and download the content.",
    filename,
    filenameSource,
    fallbackFilename,
    extended,
    name,
    savedAs: filename === null ? null : savedName(filename),
    params: params.map(({ name: paramName, value }) => ({ name: paramName, value })),
    warnings,
  });
}

/**
 * Builds a `Content-Disposition` value for a file name. ASCII names go in a
 * quoted filename; other names get an ASCII filename fallback (accents
 * removed, anything else replaced by `_`) plus an RFC 8187 `filename*`.
 */
export function buildContentDisposition(filename: string, type: "attachment" | "inline" = "attachment"): ToolResult<string | null> {
  if (filename === "") return ok(null);
  if (filename.trim() === "") return err("The file name can't be only spaces.");
  if (/[\x00-\x1f\x7f]/.test(filename)) return err("The file name can't contain line breaks or other control characters.");
  if (/[/\\]/.test(filename)) return err("The file name can't contain / or \\; clients keep only the part after the last one.");

  if (/^[\x20-\x7e]*$/.test(filename)) return ok(`${type}; filename=${quote(filename)}`);

  const fallback = filename
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "_");
  return ok(`${type}; filename=${quote(fallback)}; filename*=UTF-8''${encodeExtValue(filename)}`);
}

/** Percent-encodes everything except RFC 8187 attr-chars. */
export function encodeExtValue(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
}

function quote(value: string): string {
  return `"${value.replace(/["\\]/g, (ch) => `\\${ch}`)}"`;
}

/** The last path segment with control and Windows-reserved characters replaced, as browsers do when saving. */
function savedName(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "";
  return base.replace(/[\x00-\x1f\x7f<>:"|?*]/g, "_").trim();
}

type RawParam = DispositionParam & { quoted: boolean };

function readParams(header: string, start: number, warnings: string[]): RawParam[] {
  const params: RawParam[] = [];
  let pos = start;
  while (pos < header.length) {
    // pos is at a semicolon (or past the type when the header is malformed).
    pos++;
    while (pos < header.length && /\s/.test(header[pos])) pos++;
    if (pos >= header.length) break;
    if (header[pos] === ";") continue;

    const nameStart = pos;
    while (pos < header.length && !/[=;\s]/.test(header[pos])) pos++;
    const name = header.slice(nameStart, pos).toLowerCase();
    while (pos < header.length && /\s/.test(header[pos])) pos++;

    let value: string | null = null;
    let quoted = false;
    if (header[pos] === "=") {
      pos++;
      while (pos < header.length && /\s/.test(header[pos])) pos++;
      if (header[pos] === '"') {
        const read = readQuoted(header, pos);
        if (!read.closed) warnings.push(`The ${name || "parameter"} value starting at "${header.slice(pos, pos + 20)}" has no closing quote.`);
        value = read.value;
        quoted = true;
        pos = read.end;
        while (pos < header.length && header[pos] !== ";") pos++;
      } else {
        const end = nextSemicolon(header, pos);
        value = header.slice(pos, end).trim();
        pos = end;
        if (/\s/.test(value)) warnings.push(`The ${name} value "${value}" contains spaces, so it must be in double quotes.`);
      }
    } else if (name) {
      warnings.push(`The ${name} parameter has no value; parameters are written name=value.`);
      while (pos < header.length && header[pos] !== ";") pos++;
    }
    if (name) params.push({ name, value, quoted });
  }
  return params;
}

/** Reads a quoted string starting at the opening quote, unescaping backslash pairs. */
function readQuoted(header: string, start: number): { value: string; end: number; closed: boolean } {
  let value = "";
  let i = start + 1;
  while (i < header.length) {
    const ch = header[i];
    if (ch === "\\" && i + 1 < header.length) {
      value += header[i + 1];
      i += 2;
      continue;
    }
    if (ch === '"') return { value, end: i + 1, closed: true };
    value += ch;
    i++;
  }
  return { value, end: i, closed: false };
}

/** Index of the next `;` outside quotes, or the end of the header. */
function nextSemicolon(header: string, start: number): number {
  let inQuotes = false;
  for (let i = start; i < header.length; i++) {
    const ch = header[i];
    if (inQuotes) {
      if (ch === "\\") i++;
      else if (ch === '"') inQuotes = false;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ";") return i;
  }
  return header.length;
}
