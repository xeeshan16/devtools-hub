import { formatSeconds } from "./cache-control";
import { err, ok, type ToolResult } from "./result";

/** One directive from a `Strict-Transport-Security` header. */
export type HstsDirective = {
  /** Directive name as written; directive names are case-insensitive. */
  name: string;
  /** The argument with quotes removed, or null when the directive has none. */
  value: string | null;
  /** False for directives RFC 6797 and the preload list do not define. */
  known: boolean;
  /** Plain-language meaning of this directive with its argument. */
  description: string;
};

/** One requirement for submitting a domain to the HSTS preload list (hstspreload.org). */
export type PreloadCheck = {
  label: string;
  passed: boolean;
};

export type HstsResult = {
  directives: HstsDirective[];
  /** False when browsers ignore the whole header, e.g. max-age is missing or a directive repeats. */
  valid: boolean;
  /** The policy lifetime in seconds, when max-age is present and valid. */
  maxAge: number | null;
  includeSubDomains: boolean;
  preload: boolean;
  /** What a browser does after receiving this header over HTTPS, one sentence per point. */
  summary: string[];
  /** The header-level preload list requirements and whether this header meets them. */
  preloadChecks: PreloadCheck[];
  /** Mistakes that make browsers ignore the header or a directive, and settings worth a second look. */
  warnings: string[];
};

/** The minimum max-age hstspreload.org accepts: one year. */
export const PRELOAD_MIN_MAX_AGE = 31536000;

const PREFIX = /^(?:[<>]\s*)?strict-transport-security\s*:\s*/i;
const KNOWN = ["max-age", "includesubdomains", "preload"] as const;
const DISPLAY_NAME: Record<(typeof KNOWN)[number], string> = {
  "max-age": "max-age",
  includesubdomains: "includeSubDomains",
  preload: "preload",
};
const EXAMPLE = "max-age=31536000; includeSubDomains";

/**
 * Parses a `Strict-Transport-Security` header (optionally prefixed with the
 * header name or curl -v markers) following RFC 6797 §6.1: directives are
 * separated by semicolons, names are case-insensitive, max-age is required,
 * and a repeated directive makes browsers ignore the whole header. Only the
 * first header line is used, as browsers only process the first header field.
 */
export function parseHsts(input: string): ToolResult<HstsResult | null> {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (lines.length === 0) return ok(null);

  const warnings: string[] = [];
  if (lines.length > 1) {
    warnings.push("Only the first Strict-Transport-Security header is processed; browsers ignore any later ones.");
  }

  const parts = splitDirectives(lines[0].replace(PREFIX, ""));
  if (parts.length === 0) {
    return err(`No directives found. A Strict-Transport-Security header looks like: ${EXAMPLE}`);
  }

  const directives: HstsDirective[] = [];
  const seen = new Set<string>();
  let valid = true;
  let maxAge: number | null = null;

  for (const part of parts) {
    const eq = part.indexOf("=");
    const name = (eq === -1 ? part : part.slice(0, eq)).trim();
    const key = name.toLowerCase();
    const rawValue = eq === -1 ? null : part.slice(eq + 1).trim();
    const quoted = rawValue !== null && rawValue.length >= 2 && rawValue.startsWith('"') && rawValue.endsWith('"');
    const value = rawValue === null ? null : quoted ? unquote(rawValue) : rawValue;

    if (!name) {
      warnings.push(`"${part}" has no directive name, so browsers ignore it.`);
      continue;
    }

    if (seen.has(key)) {
      valid = false;
      warnings.push(`${name} appears more than once; RFC 6797 requires browsers to ignore the whole header when a directive repeats.`);
    }
    seen.add(key);

    if (key === "max-age") {
      let description: string;
      if (value === null || value === "") {
        valid = false;
        description = "Sets how long the browser remembers the policy, but has no value.";
        warnings.push("max-age needs a number of seconds, e.g. max-age=31536000; without one browsers ignore the whole header.");
      } else if (/^\d+$/.test(value)) {
        maxAge = Number(value);
        description =
          maxAge === 0
            ? "Tells the browser to delete any HSTS policy it has stored for this host."
            : `The browser remembers the policy for ${formatSeconds(maxAge)}, counted from each time it receives this header.`;
      } else {
        valid = false;
        description = "Sets how long the browser remembers the policy, but the value is not a whole number of seconds.";
        warnings.push(
          value.includes(",")
            ? `max-age "${value}" is not a whole number of seconds, so browsers ignore the whole header. Separate directives with semicolons, not commas.`
            : `max-age "${value}" is not a whole number of seconds, so browsers ignore the whole header.`,
        );
      }
      directives.push({ name, value, known: true, description });
      continue;
    }

    if (key === "includesubdomains" || key === "preload") {
      if (value !== null) {
        warnings.push(`${DISPLAY_NAME[key]} does not take a value; some browsers reject the whole header when it has one.`);
      }
      directives.push({
        name,
        value,
        known: true,
        description:
          key === "includesubdomains"
            ? "The policy also covers every subdomain of this host, at any depth."
            : "Signals consent to be added to the HSTS preload list built into browsers. Not part of RFC 6797; browsers ignore it when reading the header.",
      });
      continue;
    }

    const suggestion = suggest(key);
    warnings.push(
      `Unknown directive "${name}"; browsers ignore directives they don't recognize.${suggestion ? ` Did you mean ${suggestion}?` : ""}`,
    );
    directives.push({ name, value, known: false, description: "Not defined by RFC 6797 or the preload list." });
  }

  if (directives.length === 0) {
    return err(`No directives found. A Strict-Transport-Security header looks like: ${EXAMPLE}`);
  }

  if (!seen.has("max-age")) {
    valid = false;
    warnings.push("max-age is missing; it is required, so browsers ignore the whole header.");
  }

  const includeSubDomains = seen.has("includesubdomains");
  const preload = seen.has("preload");

  if (valid && maxAge === 0 && preload) {
    warnings.push("preload with max-age=0 contradicts itself: max-age=0 removes the policy, and the preload list rejects it.");
  } else if (valid && maxAge !== null && maxAge > 0 && maxAge < 86400) {
    warnings.push(
      `max-age=${maxAge} is under a day, so browsers forget the policy quickly. Short values suit a trial rollout; raise it once HTTPS works everywhere.`,
    );
  }

  const preloadChecks: PreloadCheck[] = [
    { label: `max-age is at least ${formatSeconds(PRELOAD_MIN_MAX_AGE)} (${PRELOAD_MIN_MAX_AGE})`, passed: valid && (maxAge ?? 0) >= PRELOAD_MIN_MAX_AGE },
    { label: "includeSubDomains is set", passed: includeSubDomains },
    { label: "preload is set", passed: preload },
  ];

  if (valid && preload && preloadChecks.some((check) => !check.passed)) {
    const missing = preloadChecks.filter((check) => !check.passed).map((check) => check.label);
    warnings.push(`preload is set, but the preload list also requires: ${missing.join("; ")}.`);
  }

  return ok({ directives, valid, maxAge, includeSubDomains, preload, summary: summarize(), preloadChecks, warnings });

  function summarize(): string[] {
    if (!valid || maxAge === null) return ["Browsers ignore this header, so no HSTS policy is set or updated."];
    if (maxAge === 0) {
      return [
        includeSubDomains
          ? "Removes any stored HSTS policy for this host and its subdomains (max-age=0)."
          : "Removes any stored HSTS policy for this host (max-age=0).",
        "This does not remove a domain from the preload list built into browsers; that needs a removal request.",
      ];
    }
    return [
      `For ${formatSeconds(maxAge)} after receiving this header over HTTPS, the browser rewrites http:// links and requests to https:// before sending them.`,
      includeSubDomains
        ? "The policy also covers every subdomain, so each one must serve valid HTTPS."
        : "Only this exact host is covered; subdomains are not.",
      "Certificate errors become fatal: users cannot click through the warning page.",
      "Browsers ignore the header on plain-HTTP responses, and the very first visit is unprotected unless the domain is preloaded.",
    ];
  }
}

/** Splits on semicolons outside quoted strings. Empty directives are allowed by the grammar and dropped. */
function splitDirectives(header: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < header.length; i++) {
    const ch = header[i];
    if (inQuotes && ch === "\\" && i + 1 < header.length) {
      current += ch + header[++i];
      continue;
    }
    if (ch === '"') inQuotes = !inQuotes;
    if (ch === ";" && !inQuotes) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter((p) => p !== "");
}

function unquote(value: string): string {
  return value.slice(1, -1).replace(/\\(.)/g, "$1");
}

/** Suggests a known directive for misspellings such as `include-subdomains` or `max_age`. */
function suggest(key: string): string | null {
  const squash = (s: string) => s.replace(/[^a-z]/g, "").replace(/s$/, "");
  const target = squash(key);
  if (!target) return null;
  const match = KNOWN.find((known) => squash(known) === target);
  return match ? DISPLAY_NAME[match] : null;
}
