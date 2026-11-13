import { err, ok, type ToolResult } from "./result";

/** Where a directive has meaning, per RFC 9111 §5.2 and its extensions. */
export type DirectiveContext = "request" | "response" | "both";

/** One directive from a `Cache-Control` header. */
export type CacheDirective = {
  /** Lower-cased directive name. */
  name: string;
  /** The argument with quotes removed, or null when the directive has none. */
  value: string | null;
  /** Null for directives no specification defines. */
  appliesTo: DirectiveContext | null;
  /** Plain-language meaning of this directive with its argument. */
  description: string;
  /** The argument as delta-seconds, when the directive takes one and it is valid. */
  seconds: number | null;
};

export type CacheControlResult = {
  directives: CacheDirective[];
  /** `request` when only request directives are present; the summary is then empty. */
  context: "request" | "response";
  /** What a cache does with a response carrying this header, one sentence per point. */
  summary: string[];
  /** Invalid, conflicting or ineffective directives. */
  warnings: string[];
};

type DirectiveSpec = {
  appliesTo: DirectiveContext;
  /** `seconds`: delta-seconds required; `optional-seconds`: may be omitted; `fields`: optional field-name list. */
  argument: "none" | "seconds" | "optional-seconds" | "fields";
  describe: (value: string | null, seconds: number | null) => string;
};

const SPECS: Record<string, DirectiveSpec> = {
  "max-age": {
    appliesTo: "both",
    argument: "seconds",
    describe: (_, s) =>
      s === null
        ? "Sets how long the response stays fresh."
        : `Fresh for ${formatSeconds(s)} after it was generated (in a request: only accept responses no older than this).`,
  },
  "s-maxage": {
    appliesTo: "response",
    argument: "seconds",
    describe: (_, s) =>
      s === null
        ? "Freshness lifetime for shared caches only."
        : `Shared caches (CDNs, proxies) treat it as fresh for ${formatSeconds(s)}, overriding max-age, and must revalidate once stale.`,
  },
  "no-cache": {
    appliesTo: "both",
    argument: "fields",
    describe: (v) =>
      v
        ? `The listed header fields (${v}) must not be reused without revalidation; the rest of the response may be.`
        : "Caches may store it but must revalidate with the server before every reuse.",
  },
  "no-store": {
    appliesTo: "both",
    argument: "none",
    describe: () => "No cache may store any part of the request or response.",
  },
  "no-transform": {
    appliesTo: "both",
    argument: "none",
    describe: () => "Intermediaries must not change the content, e.g. recompress images or minify text.",
  },
  public: {
    appliesTo: "response",
    argument: "none",
    describe: () => "Any cache may store it, even if it would normally not be cacheable (e.g. a response to a request with Authorization).",
  },
  private: {
    appliesTo: "response",
    argument: "fields",
    describe: (v) =>
      v
        ? `Shared caches may store the response but not the listed header fields (${v}).`
        : "Only the browser's private cache may store it; shared caches (CDNs, proxies) must not.",
  },
  "must-revalidate": {
    appliesTo: "response",
    argument: "none",
    describe: () => "Once stale, it must not be served without successfully revalidating; a cache returns 504 if the origin is unreachable.",
  },
  "proxy-revalidate": {
    appliesTo: "response",
    argument: "none",
    describe: () => "Like must-revalidate, but only for shared caches.",
  },
  "must-understand": {
    appliesTo: "response",
    argument: "none",
    describe: () => "Store it only if the cache understands the caching rules of its status code; pair it with no-store as a fallback.",
  },
  immutable: {
    appliesTo: "response",
    argument: "none",
    describe: () => "The content will never change while fresh, so browsers skip revalidation even when the user reloads (RFC 8246).",
  },
  "stale-while-revalidate": {
    appliesTo: "response",
    argument: "seconds",
    describe: (_, s) =>
      s === null
        ? "Allows serving stale content while revalidating in the background."
        : `For ${formatSeconds(s)} after it goes stale, caches may serve it while revalidating in the background (RFC 5861).`,
  },
  "stale-if-error": {
    appliesTo: "both",
    argument: "seconds",
    describe: (_, s) =>
      s === null
        ? "Allows serving stale content when the origin fails."
        : `If revalidation fails with a 5xx error or the origin is unreachable, caches may serve it stale for up to ${formatSeconds(s)} (RFC 5861).`,
  },
  "max-stale": {
    appliesTo: "request",
    argument: "optional-seconds",
    describe: (v, s) =>
      v === null
        ? "The client accepts a stale response, however stale."
        : s === null
          ? "The client accepts a stale response."
          : `The client accepts a response that has been stale for up to ${formatSeconds(s)}.`,
  },
  "min-fresh": {
    appliesTo: "request",
    argument: "seconds",
    describe: (_, s) =>
      s === null
        ? "The client wants a response that stays fresh for a while longer."
        : `The client wants a response that will still be fresh for at least ${formatSeconds(s)}.`,
  },
  "only-if-cached": {
    appliesTo: "request",
    argument: "none",
    describe: () => "The client wants only a stored response; a cache without one returns 504 instead of contacting the origin.",
  },
};

const PREFIX = /^(?:[<>]\s*)?cache-control\s*:\s*/i;
/** Directives whose invalid value RFC 9111 §4.2.1 says should make the response stale rather than be ignored. */
const FRESHNESS = new Set(["max-age", "s-maxage"]);

/**
 * Parses a `Cache-Control` header (optionally prefixed with `Cache-Control:`,
 * several lines combine as repeated header lines do) into its directives, a
 * plain-language summary of how caches treat the response, and warnings for
 * invalid, conflicting or ineffective directives.
 */
export function parseCacheControl(input: string): ToolResult<CacheControlResult | null> {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (lines.length === 0) return ok(null);

  const parts = lines.flatMap((line) => splitDirectives(line.replace(PREFIX, "")));
  if (parts.length === 0) {
    return err("No directives found. A Cache-Control header looks like: public, max-age=3600");
  }

  const warnings: string[] = [];
  const directives: CacheDirective[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const eq = part.indexOf("=");
    const name = (eq === -1 ? part : part.slice(0, eq)).trim().toLowerCase();
    const rawValue = eq === -1 ? null : part.slice(eq + 1).trim();
    const quoted = rawValue !== null && rawValue.length >= 2 && rawValue.startsWith('"') && rawValue.endsWith('"');
    const value = rawValue === null ? null : quoted ? unquote(rawValue) : rawValue;

    if (!name) {
      warnings.push(`"${part}" has no directive name, so caches ignore it.`);
      continue;
    }
    if (seen.has(name)) {
      warnings.push(
        FRESHNESS.has(name)
          ? `${name} appears more than once; caches either use the first one or treat the response as stale.`
          : `${name} appears more than once.`,
      );
    }
    seen.add(name);

    const spec = SPECS[name];
    if (!spec) {
      const suggestion = suggest(name);
      warnings.push(
        `Unknown directive "${name}"; caches ignore directives they don't recognize.${suggestion ? ` Did you mean ${suggestion}?` : ""}`,
      );
      directives.push({ name, value, appliesTo: null, description: "Not defined by any HTTP caching specification.", seconds: null });
      continue;
    }

    let seconds: number | null = null;
    if (spec.argument === "seconds" || spec.argument === "optional-seconds") {
      if (value === null || value === "") {
        if (spec.argument === "seconds") {
          warnings.push(`${name} needs a number of seconds, e.g. ${name}=3600; without one caches ignore it.`);
        }
      } else if (/^\d+$/.test(value)) {
        seconds = Number(value);
        if (quoted) warnings.push(`${name} should not be quoted; write ${name}=${value}. Some caches reject the quoted form.`);
      } else {
        warnings.push(
          FRESHNESS.has(name)
            ? `${name} "${value}" is not a whole number of seconds; caches are encouraged to treat the response as stale.`
            : `${name} "${value}" is not a whole number of seconds, so caches ignore it.`,
        );
      }
    } else if (spec.argument === "none" && value !== null) {
      warnings.push(`${name} does not take a value; "${name}=${value}" may be ignored by some caches.`);
    }

    directives.push({ name, value, appliesTo: spec.appliesTo, description: spec.describe(value, seconds), seconds });
  }

  if (directives.length === 0) {
    return err("No directives found. A Cache-Control header looks like: public, max-age=3600");
  }

  const has = (name: string) => directives.some((d) => d.name === name);
  const get = (name: string) => directives.find((d) => d.name === name);
  const seconds = (name: string) => get(name)?.seconds ?? null;

  const hasResponseOnly = directives.some((d) => d.appliesTo === "response");
  const hasRequestOnly = directives.some((d) => d.appliesTo === "request");
  const context = !hasResponseOnly && hasRequestOnly ? "request" : "response";

  if (hasResponseOnly && hasRequestOnly) {
    const requestOnly = directives.filter((d) => d.appliesTo === "request").map((d) => d.name);
    warnings.push(`${requestOnly.join(", ")} ${requestOnly.length === 1 ? "is a request directive" : "are request directives"} and has no effect in a response.`);
  }

  if (has("public") && has("private")) {
    warnings.push("public and private are both set; they contradict each other, and caches generally honor the more restrictive private.");
  }

  if (has("no-store")) {
    const overridden = ["max-age", "s-maxage", "public", "immutable", "stale-while-revalidate", "stale-if-error"].filter(has);
    if (overridden.length > 0) warnings.push(`no-store overrides ${overridden.join(", ")}; nothing is cached.`);
  }

  if (has("immutable") && seconds("max-age") === null && seconds("s-maxage") === null) {
    warnings.push("immutable has no effect without max-age; it only applies while the response is fresh.");
  }

  const privateAll = get("private")?.value === null;
  if (privateAll && has("s-maxage")) {
    warnings.push("s-maxage has no effect with private, because shared caches do not store the response.");
  }

  return ok({ directives, context, summary: context === "request" ? [] : summarize(), warnings });

  function summarize(): string[] {
    if (has("no-store")) return ["Not stored by browsers or shared caches (CDNs, proxies); every request goes to the origin."];

    const lines: string[] = [];
    lines.push(
      privateAll
        ? "Browsers may store it; shared caches (CDNs, proxies) must not."
        : "Browsers and shared caches (CDNs, proxies) may store it.",
    );

    const maxAge = seconds("max-age");
    const sMaxAge = privateAll ? null : seconds("s-maxage");
    const noCacheAll = get("no-cache")?.value === null;

    if (noCacheAll) {
      lines.push("Every reuse must be revalidated with the origin first (no-cache), typically with a conditional request.");
    } else if (maxAge === null && sMaxAge === null) {
      lines.push("No explicit lifetime: caches fall back to an Expires header or a heuristic freshness lifetime.");
    } else {
      if (maxAge !== null) {
        lines.push(
          maxAge === 0
            ? "Stale immediately (max-age=0), so caches revalidate before reusing it."
            : `${sMaxAge === null ? "Caches treat" : "Browsers treat"} it as fresh for ${formatSeconds(maxAge)} (max-age=${maxAge}).`,
        );
      }
      if (sMaxAge !== null) {
        lines.push(`Shared caches treat it as fresh for ${formatSeconds(sMaxAge)} (s-maxage=${sMaxAge}).`);
      }
    }

    if (has("must-revalidate")) {
      lines.push("Once stale, it must not be served without revalidating, even if the origin is down.");
    } else if (has("proxy-revalidate") || sMaxAge !== null) {
      lines.push("Once stale, shared caches must not serve it without revalidating.");
    }

    const swr = seconds("stale-while-revalidate");
    if (swr !== null && swr > 0) {
      lines.push(`After it goes stale, caches may keep serving it for ${formatSeconds(swr)} while refreshing in the background.`);
    }
    const sie = seconds("stale-if-error");
    if (sie !== null && sie > 0) {
      lines.push(`If the origin errors, caches may serve the stale copy for up to ${formatSeconds(sie)}.`);
    }
    if (has("immutable") && (maxAge ?? sMaxAge ?? 0) > 0 && !noCacheAll) {
      lines.push("While fresh, browsers do not revalidate it even when the user reloads the page.");
    }
    return lines;
  }
}

/** Renders delta-seconds in the largest unit that divides it exactly, e.g. 3600 → "1 hour". */
export function formatSeconds(seconds: number): string {
  const units: [number, string][] = [
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];
  for (const [size, unit] of units) {
    if (seconds >= size && seconds % size === 0) {
      const n = seconds / size;
      return `${n.toLocaleString("en-US")} ${unit}${n === 1 ? "" : "s"}`;
    }
  }
  return `${seconds.toLocaleString("en-US")} second${seconds === 1 ? "" : "s"}`;
}

/** Splits on commas outside quoted strings, so `no-cache="Set-Cookie, ETag"` stays one directive. */
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
    if (ch === "," && !inQuotes) {
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

/** Suggests a known directive for common misspellings such as `max_age` or `maxage`. */
function suggest(name: string): string | null {
  const squash = (s: string) => s.replace(/[^a-z]/g, "");
  const target = squash(name);
  if (!target) return null;
  return Object.keys(SPECS).find((known) => squash(known) === target) ?? null;
}
