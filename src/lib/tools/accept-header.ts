import { err, ok, type ToolResult } from "./result";

/** The content-negotiation request headers this parser understands. */
export type AcceptKind = "accept" | "accept-language" | "accept-encoding" | "accept-charset";

/** `auto` reads a pasted header-name prefix, otherwise guesses from the values. */
export type AcceptMode = "auto" | AcceptKind;

/** A parameter of a media range other than the weight, e.g. `level=1` or `charset=utf-8`. */
export type AcceptParam = {
  /** Parameter name, lowercased; parameter names are case-insensitive. */
  name: string;
  /** The value with quotes and escapes removed. */
  value: string;
};

/** One member of the header: a range (media range, language range, coding or charset) and its weight. */
export type AcceptRange = {
  /** The range as written, lowercased except for its parameters' values. */
  value: string;
  /** The weight from `q=`, or 1 when it is missing or invalid. */
  q: number;
  /** Media type parameters (Accept only), in the order they were written. */
  params: AcceptParam[];
  /** Higher is more specific: `*` and `*\/*` are 0, `text/*` 1, `text/html` 2, with each parameter adding 1; language ranges count their subtags. */
  specificity: number;
  /** Position in the header, from 0. */
  index: number;
  /** Plain-language meaning, e.g. "Any image type" or "German (Switzerland)". */
  description: string;
};

export type AcceptHeaderResult = {
  kind: AcceptKind;
  /** Ranges with q > 0, most preferred first: by weight, then specificity, then header order. */
  ranges: AcceptRange[];
  /** Ranges with q=0, which the client explicitly refuses. */
  refused: AcceptRange[];
  /** Syntax mistakes and members the server will ignore. */
  warnings: string[];
};

/** How one value the server can produce scores against the header. */
export type NegotiationEntry = {
  value: string;
  /** The weight the header gives this value; 0 means not acceptable. */
  q: number;
  /** The range that decided the weight, or null when nothing matched. */
  matchedBy: string | null;
};

export type NegotiationResult = {
  /** Every available value, best first; ties keep the order the server listed them in. */
  entries: NegotiationEntry[];
  /** The value a server following RFC 9110 would choose, or null when none is acceptable. */
  best: string | null;
};

const NAMES: Record<AcceptKind, string> = {
  accept: "Accept",
  "accept-language": "Accept-Language",
  "accept-encoding": "Accept-Encoding",
  "accept-charset": "Accept-Charset",
};

const PREFIX = /^(?:[<>]\s*)?(accept(?:-language|-encoding|-charset)?)\s*:\s*/i;
const TOKEN = /^[!#$%&'*+.^_`|~\dA-Za-z-]+$/;
const QVALUE = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/;
const LANGUAGE_RANGE = /^(?:\*|[a-z]{1,8}(?:-[a-z\d]{1,8})*)$/i;

/** Content codings registered with IANA (and aliases browsers still send). */
const ENCODINGS: Record<string, string> = {
  br: "Brotli compression.",
  compress: "Unix compress (LZW); obsolete, rarely supported.",
  dcb: "Dictionary-compressed Brotli, using a shared dictionary.",
  dcz: "Dictionary-compressed Zstandard, using a shared dictionary.",
  deflate: "zlib-wrapped DEFLATE compression.",
  gzip: "gzip compression, supported almost everywhere.",
  identity: "No encoding: the response body as is.",
  "x-compress": "An old alias of compress.",
  "x-gzip": "An old alias of gzip.",
  zstd: "Zstandard compression.",
};

/**
 * Parses an `Accept`, `Accept-Language`, `Accept-Encoding` or `Accept-Charset`
 * request header (optionally prefixed with its name or curl -v markers) into
 * weighted ranges following RFC 9110 §12.4–12.5, sorted the way a server
 * should prefer them. Repeated header lines are combined into one list.
 */
export function parseAcceptHeader(input: string, mode: AcceptMode = "auto"): ToolResult<AcceptHeaderResult | null> {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (lines.length === 0) return ok(null);

  const prefixed = new Set<AcceptKind>();
  const values = lines.map((line) => {
    const match = PREFIX.exec(line);
    if (!match) return line;
    prefixed.add(match[1].toLowerCase() as AcceptKind);
    return line.slice(match[0].length);
  });
  if (prefixed.size > 1) {
    return err(`These lines are different headers (${[...prefixed].map((kind) => NAMES[kind]).join(", ")}); paste one kind at a time.`);
  }

  const header = values.join(", ");
  const kind: AcceptKind = mode !== "auto" ? mode : ([...prefixed][0] ?? guessKind(header));
  const warnings: string[] = [];
  if (mode !== "auto" && prefixed.size === 1 && !prefixed.has(mode)) {
    warnings.push(`The pasted header is ${NAMES[[...prefixed][0]]}, but it is being read as ${NAMES[mode]}.`);
  }

  const members = splitTopLevel(header, ",")
    .map((member) => member.trim())
    .filter((member) => member !== "");
  if (members.length === 0) {
    if (kind === "accept-encoding") {
      return ok({ kind, ranges: [], refused: [], warnings: ["An empty Accept-Encoding header means the client wants no encoding: only identity is acceptable."] });
    }
    return err(`No values found. ${NAMES[kind]} looks like: ${example(kind)}`);
  }

  const all: AcceptRange[] = [];
  const seen = new Map<string, number>();
  members.forEach((member, index) => {
    const range = parseMember(member, index, kind, warnings);
    if (!range) return;
    const key = rangeKey(range);
    if (seen.has(key)) {
      warnings.push(`"${range.value}" appears more than once; servers usually use only one of them, so keep a single entry.`);
    }
    seen.set(key, index);
    all.push(range);
  });

  if (all.length === 0) {
    return err(`No valid values found. ${NAMES[kind]} looks like: ${example(kind)}`);
  }

  if (kind === "accept-charset") {
    warnings.push("Browsers stopped sending Accept-Charset; servers should simply use UTF-8.");
  }

  const ranges = all
    .filter((range) => range.q > 0)
    .sort((a, b) => b.q - a.q || b.specificity - a.specificity || a.index - b.index);
  const refused = all.filter((range) => range.q === 0);
  return ok({ kind, ranges, refused, warnings });
}

function parseMember(member: string, index: number, kind: AcceptKind, warnings: string[]): AcceptRange | null {
  const [rawRange, ...rawParams] = splitTopLevel(member, ";").map((part) => part.trim());
  const range = rawRange.toLowerCase();

  if (!validRange(range, kind)) {
    warnings.push(`"${rawRange}" is not a valid ${describeKind(kind)}${hint(rawRange, kind)}; servers ignore it.`);
    return null;
  }

  let q = 1;
  let sawQ = false;
  const params: AcceptParam[] = [];
  for (const raw of rawParams) {
    if (raw === "") continue;
    const eq = raw.indexOf("=");
    const name = (eq === -1 ? raw : raw.slice(0, eq)).trim().toLowerCase();
    const value = eq === -1 ? "" : unquote(raw.slice(eq + 1).trim());

    if (name === "q") {
      if (sawQ) {
        warnings.push(`"${rawRange}" has more than one q; only the first counts.`);
        continue;
      }
      sawQ = true;
      if (QVALUE.test(value)) {
        q = Number(value);
      } else {
        warnings.push(`"${rawRange}" has q=${value}, but q must be between 0 and 1 with at most three decimals; it is treated as q=1.`);
      }
      continue;
    }

    if (sawQ) {
      warnings.push(`"${rawRange}" has ${name} after q; parameters after the weight are ignored.`);
      continue;
    }
    if (kind !== "accept") {
      warnings.push(`"${rawRange}" has a ${name} parameter, but ${NAMES[kind]} only allows q; it is ignored.`);
      continue;
    }
    if (eq === -1 || !TOKEN.test(name)) {
      warnings.push(`"${raw}" in "${rawRange}" is not a name=value parameter; it is ignored.`);
      continue;
    }
    params.push({ name, value });
  }

  return {
    value: range,
    q,
    params,
    specificity: specificity(range, kind) + params.length,
    index,
    description: describeRange(range, kind),
  };
}

function validRange(range: string, kind: AcceptKind): boolean {
  if (kind === "accept") {
    const [type, subtype, extra] = range.split("/");
    if (extra !== undefined || subtype === undefined || !TOKEN.test(type) || !TOKEN.test(subtype)) return false;
    return !(type === "*" && subtype !== "*");
  }
  if (kind === "accept-language") return LANGUAGE_RANGE.test(range);
  return TOKEN.test(range);
}

function hint(range: string, kind: AcceptKind): string {
  if (kind === "accept" && /^\*\/[^*]/.test(range)) return " (a wildcard type needs a wildcard subtype: */*)";
  if (kind === "accept" && !range.includes("/")) return " (a media range is type/subtype, e.g. text/html)";
  if (kind === "accept-language" && range.includes("_")) return ` (language tags use hyphens: ${range.replace(/_/g, "-")})`;
  return "";
}

function specificity(range: string, kind: AcceptKind): number {
  if (range === "*" || range === "*/*") return 0;
  if (kind === "accept") return range.endsWith("/*") ? 1 : 2;
  if (kind === "accept-language") return range.split("-").length;
  return 1;
}

function rangeKey(range: AcceptRange): string {
  return [range.value, ...range.params.map(({ name, value }) => `${name}=${value.toLowerCase()}`)].join(";");
}

function describeRange(range: string, kind: AcceptKind): string {
  if (kind === "accept") {
    if (range === "*/*") return "Any media type.";
    if (range.endsWith("/*")) return `Any ${range.slice(0, -2)} type.`;
    return `The ${range} media type.`;
  }
  if (kind === "accept-language") {
    if (range === "*") return "Any language.";
    const name = languageName(range);
    return name ? `${name}.` : "A language tag this browser can't name.";
  }
  if (kind === "accept-encoding") {
    if (range === "*") return "Any content coding not listed explicitly.";
    return ENCODINGS[range] ?? "Not a registered content coding; servers that don't know it ignore it.";
  }
  if (range === "*") return "Any character set not listed explicitly.";
  return `The ${range} character set.`;
}

function languageName(range: string): string | null {
  try {
    const name = new Intl.DisplayNames(["en"], { type: "language", fallback: "none" }).of(range);
    return name ?? null;
  } catch {
    return null;
  }
}

function describeKind(kind: AcceptKind): string {
  if (kind === "accept") return "media range";
  if (kind === "accept-language") return "language range";
  if (kind === "accept-encoding") return "content coding";
  return "character set";
}

function example(kind: AcceptKind): string {
  if (kind === "accept") return "text/html, application/json;q=0.9, */*;q=0.8";
  if (kind === "accept-language") return "en-US, en;q=0.9, de;q=0.7";
  if (kind === "accept-encoding") return "gzip, deflate, br, zstd";
  return "utf-8, iso-8859-1;q=0.5";
}

function guessKind(header: string): AcceptKind {
  const first = splitTopLevel(header, ",")
    .map((member) => splitTopLevel(member, ";")[0].trim().toLowerCase())
    .filter((range) => range !== "" && range !== "*");
  if (first.some((range) => range.includes("/"))) return "accept";
  if (first.length > 0 && first.every((range) => range in ENCODINGS)) return "accept-encoding";
  if (first.length > 0 && first.every((range) => /^(?:utf-|iso-|us-ascii|windows-)/.test(range))) return "accept-charset";
  if (first.length > 0 && first.every((range) => LANGUAGE_RANGE.test(range))) return "accept-language";
  return "accept";
}

/**
 * Scores each value the server can produce against a parsed header, the way
 * RFC 9110 §12.5 describes: the most specific matching range sets its weight
 * (language ranges match by prefix, RFC 4647 basic filtering), and unlisted
 * values are not acceptable, except identity in Accept-Encoding, which is
 * acceptable unless refused.
 */
export function negotiate(result: AcceptHeaderResult, available: string[]): NegotiationResult {
  const all = [...result.ranges, ...result.refused];
  const entries = available
    .map((value) => value.trim())
    .filter((value) => value !== "")
    .map((value, order) => ({ ...score(value, all, result.kind), order }))
    .sort((a, b) => b.q - a.q || a.order - b.order)
    .map(({ value, q, matchedBy }) => ({ value, q, matchedBy }));
  return { entries, best: entries[0]?.q > 0 ? entries[0].value : null };
}

function score(value: string, ranges: AcceptRange[], kind: AcceptKind): NegotiationEntry {
  const matches = ranges
    .filter((range) => rangeMatches(range, value, kind))
    .sort((a, b) => b.specificity - a.specificity || a.index - b.index);
  const match = matches[0];
  if (match) return { value, q: match.q, matchedBy: label(match) };
  if (kind === "accept-encoding" && value.toLowerCase() === "identity") {
    return { value, q: 1, matchedBy: null };
  }
  return { value, q: 0, matchedBy: null };
}

function rangeMatches(range: AcceptRange, raw: string, kind: AcceptKind): boolean {
  if (kind === "accept") {
    const [mediaType, ...rawParams] = splitTopLevel(raw, ";").map((part) => part.trim());
    const [type, subtype] = mediaType.toLowerCase().split("/");
    const [rangeType, rangeSubtype] = range.value.split("/");
    if (rangeType !== "*" && rangeType !== type) return false;
    if (rangeSubtype !== "*" && rangeSubtype !== subtype) return false;
    const params = new Map(
      rawParams.map((param) => {
        const eq = param.indexOf("=");
        return [param.slice(0, eq === -1 ? undefined : eq).trim().toLowerCase(), eq === -1 ? "" : unquote(param.slice(eq + 1).trim()).toLowerCase()];
      }),
    );
    return range.params.every(({ name, value }) => params.get(name) === value.toLowerCase());
  }
  const value = raw.toLowerCase();
  if (range.value === "*") return true;
  if (kind === "accept-language") return value === range.value || value.startsWith(`${range.value}-`);
  return value === range.value;
}

function label(range: AcceptRange): string {
  const params = range.params.map(({ name, value }) => `;${name}=${value}`).join("");
  return `${range.value}${params}${range.q === 1 ? "" : `;q=${range.q}`}`;
}

/** Splits on a separator outside double quotes. */
function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === "\\") i++;
      else if (ch === '"') inQuotes = false;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === separator) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

function unquote(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\(.)/g, "$1");
  }
  return value;
}
