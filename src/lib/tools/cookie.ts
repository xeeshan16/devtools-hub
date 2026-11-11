import { err, ok, type ToolResult } from "./result";

/** `auto` reads a pasted `Set-Cookie:` prefix or cookie attributes as Set-Cookie. */
export type CookieMode = "auto" | "cookie" | "set-cookie";

export type SameSite = "Strict" | "Lax" | "None";

/** One `name=value` pair from a `Cookie` request header. */
export type CookiePair = {
  name: string;
  /** The value exactly as sent. */
  value: string;
  /** The value with percent-escapes decoded, or as sent if they are malformed. */
  decoded: string;
  /** True when the same name appears more than once in the header. */
  duplicate: boolean;
};

export type CookieAttribute = { name: string; value: string };

/** One `Set-Cookie` response header, read the way RFC 6265 tells browsers to. */
export type SetCookie = {
  name: string;
  value: string;
  decoded: string;
  /** `Expires` as an ISO 8601 timestamp, or null when absent or unparseable. */
  expires: string | null;
  /** `Max-Age` in seconds, or null when absent or invalid. */
  maxAge: number | null;
  /** `session` ends with the browser session; `delete` removes an existing cookie. */
  lifetime: "session" | "persistent" | "delete";
  /** Lower-cased, without a leading dot; null means host-only. */
  domain: string | null;
  /** The path as given, or null when absent or invalid (the default path applies). */
  path: string | null;
  secure: boolean;
  httpOnly: boolean;
  partitioned: boolean;
  sameSite: SameSite | null;
  /** Attributes browsers do not recognize and ignore, e.g. `Priority`. */
  unknown: CookieAttribute[];
  /** Problems that make browsers reject the cookie or ignore part of it. */
  warnings: string[];
};

export type CookieParseResult =
  | { kind: "cookie"; pairs: CookiePair[] }
  | { kind: "set-cookie"; cookies: SetCookie[] };

/** Browsers cap cookie lifetimes at 400 days (RFC 6265bis). */
export const MAX_AGE_CAP_SECONDS = 400 * 24 * 60 * 60;

const SET_COOKIE_PREFIX = /^(?:<\s*)?set-cookie\s*:\s*/i;
const COOKIE_PREFIX = /^(?:>\s*)?cookie\s*:\s*/i;
const KNOWN_ATTRIBUTES = /;\s*(?:expires|max-age|domain|path|secure|httponly|samesite|partitioned)\s*(?:=|;|$)/i;
/** RFC 6265 cookie-name: an HTTP token, so no separators, spaces or controls. */
const TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

/**
 * Parses a `Cookie` request header into name/value pairs, or one
 * `Set-Cookie` header per line into its attributes, flagging the mistakes
 * that make browsers drop a cookie (SameSite=None without Secure, broken
 * `__Host-` prefixes, invalid Max-Age and so on).
 */
export function parseCookies(input: string, mode: CookieMode = "auto"): ToolResult<CookieParseResult | null> {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (lines.length === 0) return ok(null);

  const kind = mode === "auto" ? detectKind(lines) : mode;
  return kind === "cookie" ? parseCookieHeader(lines) : parseSetCookieLines(lines);
}

function detectKind(lines: string[]): "cookie" | "set-cookie" {
  return lines.some((line) => SET_COOKIE_PREFIX.test(line) || KNOWN_ATTRIBUTES.test(line))
    ? "set-cookie"
    : "cookie";
}

function parseCookieHeader(lines: string[]): ToolResult<CookieParseResult> {
  const pairs: CookiePair[] = [];
  for (const line of lines) {
    for (const segment of line.replace(COOKIE_PREFIX, "").split(";")) {
      const trimmed = segment.trim();
      if (!trimmed) continue;
      const { name, value } = splitPair(trimmed);
      pairs.push({ name, value, decoded: safeDecode(value), duplicate: false });
    }
  }
  if (pairs.length === 0) return err("No cookies found. A Cookie header looks like: session=abc123; theme=dark");

  const counts = new Map<string, number>();
  for (const pair of pairs) counts.set(pair.name, (counts.get(pair.name) ?? 0) + 1);
  for (const pair of pairs) pair.duplicate = (counts.get(pair.name) ?? 0) > 1;

  return ok({ kind: "cookie", pairs });
}

function parseSetCookieLines(lines: string[]): ToolResult<CookieParseResult> {
  const cookies: SetCookie[] = [];
  for (const [index, line] of lines.entries()) {
    const parsed = parseSetCookie(line.replace(SET_COOKIE_PREFIX, ""));
    if (!parsed.ok) {
      return err(lines.length > 1 ? `Line ${index + 1}: ${parsed.error}` : parsed.error);
    }
    cookies.push(parsed.value);
  }
  return ok({ kind: "set-cookie", cookies });
}

/** Parses a single Set-Cookie header value (without the `Set-Cookie:` name). */
export function parseSetCookie(header: string): ToolResult<SetCookie> {
  const [pairPart, ...attributeParts] = header.split(";");
  const { name, value } = splitPair(pairPart.trim());
  if (!name && !value) {
    return err("The cookie has no name or value. A Set-Cookie header starts with name=value, e.g. id=a3fWa; Path=/");
  }

  const warnings: string[] = [];
  if (name && !TOKEN.test(name)) {
    warnings.push(`The name "${name}" contains spaces or separator characters that are not allowed in a cookie name.`);
  }

  const cookie: SetCookie = {
    name,
    value,
    decoded: safeDecode(value),
    expires: null,
    maxAge: null,
    lifetime: "session",
    domain: null,
    path: null,
    secure: false,
    httpOnly: false,
    partitioned: false,
    sameSite: null,
    unknown: [],
    warnings,
  };

  const seen = new Set<string>();
  for (const part of attributeParts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    const rawName = (eq === -1 ? trimmed : trimmed.slice(0, eq)).trim();
    const attrValue = eq === -1 ? "" : trimmed.slice(eq + 1).trim();
    const key = rawName.toLowerCase();

    if (seen.has(key) && key !== "") {
      warnings.push(`${rawName} is set more than once; browsers use the last one.`);
    }
    seen.add(key);

    switch (key) {
      case "expires": {
        const time = parseCookieDate(attrValue);
        if (time === null) {
          warnings.push(`Expires "${attrValue}" is not a valid date, so browsers ignore it. Use a format like Wed, 21 Oct 2026 07:28:00 GMT.`);
        } else {
          cookie.expires = new Date(time).toISOString();
        }
        break;
      }
      case "max-age": {
        if (/^-?\d+$/.test(attrValue)) {
          cookie.maxAge = Number(attrValue);
        } else {
          warnings.push(`Max-Age "${attrValue}" is not a whole number of seconds, so browsers ignore it.`);
        }
        break;
      }
      case "domain":
        cookie.domain = attrValue ? attrValue.replace(/^\./, "").toLowerCase() : null;
        break;
      case "path":
        if (attrValue.startsWith("/")) {
          cookie.path = attrValue;
        } else {
          warnings.push(
            attrValue
              ? `Path "${attrValue}" does not start with /, so browsers ignore it and use the default path.`
              : "Path is empty, so browsers use the default path (the request path up to its last /).",
          );
        }
        break;
      case "secure":
        cookie.secure = true;
        break;
      case "httponly":
        cookie.httpOnly = true;
        break;
      case "partitioned":
        cookie.partitioned = true;
        break;
      case "samesite": {
        const match = (["Strict", "Lax", "None"] as const).find((v) => v.toLowerCase() === attrValue.toLowerCase());
        if (match) {
          cookie.sameSite = match;
        } else {
          warnings.push(`SameSite "${attrValue}" is not Strict, Lax or None, so browsers ignore it and apply their default.`);
        }
        break;
      }
      default:
        cookie.unknown.push({ name: rawName, value: attrValue });
    }
  }

  if (cookie.maxAge !== null) {
    cookie.lifetime = cookie.maxAge <= 0 ? "delete" : "persistent";
    if (cookie.expires) warnings.push("Both Max-Age and Expires are set; browsers use Max-Age.");
    if (cookie.maxAge > MAX_AGE_CAP_SECONDS) {
      warnings.push("Max-Age is longer than 400 days; browsers cap cookie lifetimes at 400 days.");
    }
  } else if (cookie.expires) {
    cookie.lifetime = Date.parse(cookie.expires) <= Date.now() ? "delete" : "persistent";
  }

  if (cookie.sameSite === "None" && !cookie.secure) {
    warnings.push("SameSite=None requires Secure; browsers reject this cookie.");
  }
  if (cookie.partitioned && !cookie.secure) {
    warnings.push("Partitioned requires Secure; browsers reject this cookie.");
  }
  if (name.startsWith("__Secure-") && !cookie.secure) {
    warnings.push("Cookies named __Secure-… must be set with Secure; browsers reject this cookie.");
  }
  if (name.startsWith("__Host-")) {
    if (!cookie.secure || cookie.path !== "/" || cookie.domain !== null) {
      warnings.push("Cookies named __Host-… need Secure, Path=/ and no Domain; browsers reject this cookie.");
    }
  }

  return ok(cookie);
}

/**
 * Parses an Expires date. Accepts the IMF-fixdate browsers send
 * (`Wed, 21 Oct 2026 07:28:00 GMT`) and the older dashed form
 * (`Wed, 21-Oct-26 07:28:00 GMT`). Returns epoch milliseconds or null.
 */
export function parseCookieDate(input: string): number | null {
  if (!input) return null;
  const normalized = input.replace(/(\d{1,2})-([A-Za-z]{3})-(\d{2,4})/, (_, day: string, month: string, year: string) => {
    // RFC 6265 §5.1.1: two-digit years 70–99 are 19xx, 00–69 are 20xx.
    const fullYear = year.length === 2 ? (Number(year) >= 70 ? `19${year}` : `20${year}`) : year;
    return `${day} ${month} ${fullYear}`;
  });
  const time = Date.parse(normalized);
  return Number.isNaN(time) ? null : time;
}

/** Splits at the first `=`; a segment without one is a value with an empty name. */
function splitPair(segment: string): { name: string; value: string } {
  const eq = segment.indexOf("=");
  if (eq === -1) return { name: "", value: segment.trim() };
  return { name: segment.slice(0, eq).trim(), value: segment.slice(eq + 1).trim() };
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
