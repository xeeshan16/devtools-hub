import { err, ok, type ToolResult } from "./result";

/** How much a finding weakens the policy. */
export type CspSeverity = "high" | "medium" | "low";

export type CspFinding = {
  severity: CspSeverity;
  message: string;
};

/** One directive from a policy, in the order it appears. */
export type CspDirective = {
  /** Lower-cased directive name. */
  name: string;
  /** Source expressions or tokens, as written. */
  values: string[];
  /** False for directives no specification defines; browsers ignore them. */
  known: boolean;
  /** Plain-language meaning of the directive. */
  description: string;
};

/** The rule that actually governs one resource type once fallbacks are applied. */
export type CspEffectiveSource = {
  /** The directive being resolved, e.g. `script-src`. */
  directive: string;
  /** The directive that supplies the sources, or null when nothing restricts it. */
  from: string | null;
  /** The governing source list, or null when unrestricted. */
  values: string[] | null;
};

export type CspPolicy = {
  /** True for `Content-Security-Policy-Report-Only`: violations are reported, nothing is blocked. */
  reportOnly: boolean;
  directives: CspDirective[];
  effective: CspEffectiveSource[];
  findings: CspFinding[];
};

export type CspResult = {
  policies: CspPolicy[];
  /** Problems with the header as a whole rather than with one policy. */
  warnings: string[];
};

type DirectiveKind = "fetch" | "document" | "navigation" | "reporting" | "other";

type DirectiveSpec = {
  kind: DirectiveKind;
  description: string;
  /** Set when browsers no longer support the directive, or are phasing it out. */
  deprecated?: string;
};

const FALLBACK_NOTE = "Falls back to default-src.";

const SPECS: Record<string, DirectiveSpec> = {
  "default-src": {
    kind: "fetch",
    description: "Fallback source list for every fetch directive that is not set explicitly (scripts, styles, images, fonts, connections and so on).",
  },
  "script-src": {
    kind: "fetch",
    description: `Where JavaScript may be loaded from, and whether inline scripts, event handlers and eval are allowed. ${FALLBACK_NOTE}`,
  },
  "script-src-elem": {
    kind: "fetch",
    description: "Sources for <script> elements only. Falls back to script-src, then default-src.",
  },
  "script-src-attr": {
    kind: "fetch",
    description: "Inline event handlers such as onclick. Falls back to script-src, then default-src.",
  },
  "style-src": {
    kind: "fetch",
    description: `Where stylesheets may be loaded from, and whether inline <style> and style attributes are allowed. ${FALLBACK_NOTE}`,
  },
  "style-src-elem": {
    kind: "fetch",
    description: "Sources for <style> and <link rel=stylesheet> elements only. Falls back to style-src, then default-src.",
  },
  "style-src-attr": {
    kind: "fetch",
    description: "Inline style attributes. Falls back to style-src, then default-src.",
  },
  "img-src": { kind: "fetch", description: `Images and favicons. ${FALLBACK_NOTE}` },
  "font-src": { kind: "fetch", description: `Web fonts loaded with @font-face. ${FALLBACK_NOTE}` },
  "connect-src": {
    kind: "fetch",
    description: `Destinations for fetch(), XMLHttpRequest, WebSocket, EventSource and sendBeacon. ${FALLBACK_NOTE}`,
  },
  "media-src": { kind: "fetch", description: `<audio>, <video> and <track> sources. ${FALLBACK_NOTE}` },
  "object-src": { kind: "fetch", description: `Plugin content in <object> and <embed>. ${FALLBACK_NOTE}` },
  "frame-src": {
    kind: "fetch",
    description: "Pages this document may embed in <iframe> and <frame>. Falls back to child-src, then default-src.",
  },
  "child-src": {
    kind: "fetch",
    description: `Frames and workers, for browsers without frame-src or worker-src. ${FALLBACK_NOTE}`,
  },
  "worker-src": {
    kind: "fetch",
    description: "Scripts for Worker, SharedWorker and service workers. Falls back to child-src, script-src, then default-src.",
  },
  "manifest-src": { kind: "fetch", description: `Web app manifests. ${FALLBACK_NOTE}` },
  "fenced-frame-src": { kind: "fetch", description: "Pages this document may embed in <fencedframe>. Falls back to frame-src, child-src, then default-src." },
  "prefetch-src": {
    kind: "fetch",
    description: "Prefetch and prerender destinations.",
    deprecated: "prefetch-src was removed from the specification and browsers ignore it.",
  },
  "base-uri": {
    kind: "document",
    description: "URLs allowed in a <base> element. Does not fall back to default-src.",
  },
  sandbox: {
    kind: "document",
    description: "Applies iframe-style sandbox restrictions to the page itself; listed allow-* tokens lift individual restrictions.",
  },
  "form-action": {
    kind: "navigation",
    description: "Where forms may be submitted. Does not fall back to default-src.",
  },
  "frame-ancestors": {
    kind: "navigation",
    description: "Which sites may embed this page in a frame (clickjacking protection, replacing X-Frame-Options). Does not fall back to default-src.",
  },
  "navigate-to": {
    kind: "navigation",
    description: "Destinations the document may navigate to.",
    deprecated: "navigate-to was removed from the specification and no browser enforces it.",
  },
  "report-uri": {
    kind: "reporting",
    description: "URL that receives violation reports as JSON POST requests.",
    deprecated: "report-uri is deprecated in favor of report-to, but keep it alongside report-to until every browser you support handles report-to.",
  },
  "report-to": {
    kind: "reporting",
    description: "Name of a Reporting-Endpoints (or Report-To) group that receives violation reports.",
  },
  "upgrade-insecure-requests": {
    kind: "other",
    description: "Rewrites http:// subresource URLs and same-site links to https:// before requesting them.",
  },
  "block-all-mixed-content": {
    kind: "other",
    description: "Blocks every http:// subresource on an https:// page.",
    deprecated: "block-all-mixed-content is deprecated; browsers now block or upgrade mixed content by default. Use upgrade-insecure-requests instead.",
  },
  "require-trusted-types-for": {
    kind: "other",
    description: "With 'script', DOM sinks such as innerHTML only accept Trusted Types objects, which blocks most DOM XSS.",
  },
  "trusted-types": {
    kind: "other",
    description: "Names of the Trusted Types policies the page may create.",
  },
  "plugin-types": {
    kind: "other",
    description: "MIME types allowed in <object> and <embed>.",
    deprecated: "plugin-types was removed from the specification; use object-src 'none' instead.",
  },
  referrer: {
    kind: "other",
    description: "Referrer policy.",
    deprecated: "The referrer directive was removed; send a Referrer-Policy header instead.",
  },
  "require-sri-for": {
    kind: "other",
    description: "Required Subresource Integrity for scripts and styles.",
    deprecated: "require-sri-for was never shipped by mainstream browsers and is ignored.",
  },
};

/** Fallback order for fetch directives (CSP Level 3 §6.8.3), excluding the directive itself. */
const FALLBACKS: Record<string, string[]> = {
  "script-src-elem": ["script-src", "default-src"],
  "script-src-attr": ["script-src", "default-src"],
  "style-src-elem": ["style-src", "default-src"],
  "style-src-attr": ["style-src", "default-src"],
  "worker-src": ["child-src", "script-src", "default-src"],
  "frame-src": ["child-src", "default-src"],
  "fenced-frame-src": ["frame-src", "child-src", "default-src"],
};

/** Resource types summarized in the effective-sources table, in display order. */
const EFFECTIVE = [
  "script-src",
  "style-src",
  "img-src",
  "font-src",
  "connect-src",
  "media-src",
  "object-src",
  "frame-src",
  "worker-src",
  "manifest-src",
  "base-uri",
  "form-action",
  "frame-ancestors",
];

const KEYWORDS = new Set([
  "'self'",
  "'none'",
  "'unsafe-inline'",
  "'unsafe-eval'",
  "'strict-dynamic'",
  "'unsafe-hashes'",
  "'report-sample'",
  "'wasm-unsafe-eval'",
  "'inline-speculation-rules'",
  "'unsafe-allow-redirects'",
]);

const SANDBOX_TOKENS = new Set([
  "allow-downloads",
  "allow-forms",
  "allow-modals",
  "allow-orientation-lock",
  "allow-pointer-lock",
  "allow-popups",
  "allow-popups-to-escape-sandbox",
  "allow-presentation",
  "allow-same-origin",
  "allow-scripts",
  "allow-storage-access-by-user-activation",
  "allow-top-navigation",
  "allow-top-navigation-by-user-activation",
  "allow-top-navigation-to-custom-protocols",
]);

const NONCE = /^'nonce-[A-Za-z0-9+/_=-]+'$/;
const HASH = /^'sha(256|384|512)-[A-Za-z0-9+/_=-]+'$/i;
const SCHEME = /^[a-z][a-z0-9+.-]*:$/i;
/** scheme://, then a host with an optional leading *., an optional port (or *) and an optional path. */
const HOST = /^(?:[a-z][a-z0-9+.-]*:\/\/)?(?:\*|(?:\*\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*)(?::(?:\d+|\*))?(?:\/[^\s;,]*)?$/i;
const PREFIX = /^(?:[<>]\s*)?content-security-policy(-report-only)?\s*:\s*/i;
const EMPTY_ERROR = "No directives found. A Content-Security-Policy header looks like: default-src 'self'; img-src 'self' data:";

type Header = { reportOnly: boolean; text: string };

/**
 * Parses a `Content-Security-Policy` header (optionally prefixed with the header
 * name, as copied from curl -v or DevTools) into its directives, the sources that
 * effectively govern each resource type once fallbacks are applied, and findings
 * for syntax mistakes and common weaknesses.
 *
 * Lines that start with a header name begin a new header; other lines continue
 * the previous one, so a policy formatted one directive per line still parses.
 * Commas separate policies, as they do when a browser combines repeated headers.
 */
export function parseCsp(input: string): ToolResult<CspResult | null> {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (lines.length === 0) return ok(null);

  const headers: Header[] = [];
  for (const line of lines) {
    const match = PREFIX.exec(line);
    if (match || headers.length === 0) {
      headers.push({ reportOnly: Boolean(match?.[1]), text: match ? line.slice(match[0].length) : line });
    } else {
      headers[headers.length - 1].text += `;${line}`;
    }
  }

  const warnings: string[] = [];
  const policies: CspPolicy[] = [];
  let commaSplit = false;

  for (const header of headers) {
    const texts = header.text.split(",");
    if (texts.length > 1) commaSplit = true;
    for (const text of texts) {
      const policy = parsePolicy(text, header.reportOnly);
      if (policy) policies.push(policy);
    }
  }

  if (policies.length === 0) return err(EMPTY_ERROR);

  if (commaSplit) {
    warnings.push(
      `The header contains a comma, which separates policies, so the browser enforces ${policies.length === 1 ? "it as one policy" : `${policies.length} separate policies`} and a request must pass all of them. Separate directives with semicolons.`,
    );
  }

  return ok({ policies, warnings });
}

function parsePolicy(text: string, reportOnly: boolean): CspPolicy | null {
  const findings: CspFinding[] = [];
  const directives: CspDirective[] = [];
  const seen = new Set<string>();

  for (const raw of text.split(";")) {
    const tokens = raw.trim().split(/\s+/).filter((t) => t !== "");
    if (tokens.length === 0) continue;
    const name = tokens[0].toLowerCase();
    const values = tokens.slice(1);

    if (!/^[a-z0-9-]+$/.test(name)) {
      findings.push({ severity: "medium", message: `"${tokens[0]}" is not a valid directive name, so browsers ignore "${raw.trim()}".` });
      continue;
    }
    if (seen.has(name)) {
      findings.push({ severity: "medium", message: `${name} appears more than once; browsers use the first and ignore the rest.` });
      continue;
    }
    seen.add(name);

    const spec = SPECS[name];
    if (!spec) {
      const suggestion = suggest(name);
      findings.push({
        severity: "medium",
        message: `Unknown directive "${name}"; browsers ignore it.${suggestion ? ` Did you mean ${suggestion}?` : ""}`,
      });
      directives.push({ name, values, known: false, description: "Not defined by the Content Security Policy specification." });
      continue;
    }

    if (spec.deprecated) findings.push({ severity: "low", message: spec.deprecated });
    checkValues(name, spec, values, findings);
    directives.push({ name, values, known: true, description: spec.description });
  }

  if (directives.length === 0 && findings.length === 0) return null;

  const byName = new Map(directives.filter((d) => d.known).map((d) => [d.name, d.values]));
  const effective = EFFECTIVE.map((directive) => resolve(directive, byName));
  findings.push(...analyze(byName, effective, reportOnly));

  return { reportOnly, directives, effective, findings };
}

function resolve(directive: string, byName: Map<string, string[]>): CspEffectiveSource {
  const chain = [directive, ...(SPECS[directive].kind === "fetch" ? (FALLBACKS[directive] ?? ["default-src"]) : [])];
  for (const candidate of chain) {
    const values = byName.get(candidate);
    if (values) return { directive, from: candidate, values };
  }
  return { directive, from: null, values: null };
}

/** Flags source expressions browsers would misread or ignore. */
function checkValues(name: string, spec: DirectiveSpec, values: string[], findings: CspFinding[]): void {
  if (name === "upgrade-insecure-requests" || name === "block-all-mixed-content") {
    if (values.length > 0) findings.push({ severity: "low", message: `${name} does not take a value; "${values.join(" ")}" is ignored.` });
    return;
  }
  if (name === "sandbox") {
    for (const token of values) {
      if (!SANDBOX_TOKENS.has(token.toLowerCase())) {
        findings.push({ severity: "medium", message: `sandbox token "${token}" is not recognized, so that restriction stays in place.` });
      }
    }
    return;
  }
  if (spec.kind !== "fetch" && name !== "base-uri" && name !== "form-action" && name !== "frame-ancestors") return;

  for (const value of values) {
    const lower = value.toLowerCase();
    if (KEYWORDS.has(lower) || NONCE.test(value) || HASH.test(value)) {
      if ((NONCE.test(value) || HASH.test(value)) && (name === "frame-ancestors" || name === "base-uri" || name === "form-action")) {
        findings.push({ severity: "medium", message: `${value} has no meaning in ${name}; nonces and hashes only apply to scripts and styles.` });
      }
      continue;
    }
    if (KEYWORDS.has(`'${lower}'`)) {
      findings.push({
        severity: "high",
        message: `${value} in ${name} is missing its single quotes, so browsers read it as a host named "${value}". Write '${lower}'.`,
      });
      continue;
    }
    if (/^nonce-|^sha(256|384|512)-/i.test(value)) {
      findings.push({ severity: "high", message: `${value} in ${name} must be wrapped in single quotes, e.g. '${value}'.` });
      continue;
    }
    if (value.startsWith("'") || value.startsWith('"')) {
      findings.push({ severity: "medium", message: `${value} in ${name} is not a recognized keyword, nonce or hash, so browsers ignore it.` });
      continue;
    }
    if (!SCHEME.test(value) && !HOST.test(value)) {
      findings.push({ severity: "medium", message: `${value} in ${name} is not a valid source expression, so browsers ignore it.` });
    }
  }

  if (values.length > 1 && values.some((v) => v.toLowerCase() === "'none'")) {
    findings.push({ severity: "medium", message: `${name} combines 'none' with other sources; 'none' is ignored and the other sources apply.` });
  }
}

function analyze(byName: Map<string, string[]>, effective: CspEffectiveSource[], reportOnly: boolean): CspFinding[] {
  const findings: CspFinding[] = [];
  const get = (directive: string) => effective.find((e) => e.directive === directive)!;

  const script = get("script-src");
  if (script.values === null) {
    findings.push({
      severity: "high",
      message: "There is no script-src or default-src, so scripts may load from any origin and inline scripts run. This policy does not protect against XSS.",
    });
  } else {
    const values = script.values.map((v) => v.toLowerCase());
    const where = script.from === "script-src" ? "script-src" : `${script.from} (used for scripts because script-src is not set)`;
    const hasNonceOrHash = script.values.some((v) => NONCE.test(v) || HASH.test(v));
    const strictDynamic = values.includes("'strict-dynamic'");

    if (values.includes("'unsafe-inline'")) {
      findings.push(
        hasNonceOrHash || strictDynamic
          ? { severity: "low", message: `'unsafe-inline' in ${where} is ignored by modern browsers because a nonce, hash or 'strict-dynamic' is present; it only acts as a fallback for very old browsers.` }
          : { severity: "high", message: `'unsafe-inline' in ${where} lets injected inline scripts and event handlers run, which defeats most XSS protection. Use nonces or hashes instead.` },
      );
    }
    if (values.includes("'unsafe-eval'")) {
      findings.push({ severity: "medium", message: `'unsafe-eval' in ${where} allows eval(), new Function() and string timers, which turn injected strings into code.` });
    }
    if (strictDynamic && !hasNonceOrHash) {
      findings.push({ severity: "medium", message: `'strict-dynamic' in ${where} ignores host sources and 'self', and there is no nonce or hash to trust a first script, so no script can load.` });
    }
    if (!strictDynamic) {
      const broad = script.values.filter((v) => v === "*" || /^(https?|data|blob):$/i.test(v));
      if (broad.length > 0) {
        findings.push({ severity: "high", message: `${broad.join(" ")} in ${where} lets scripts load from ${broad.includes("data:") || broad.includes("blob:") ? "attacker-controlled URLs" : "almost any origin"}, so an attacker can include their own script.` });
      }
    }
  }

  const object = get("object-src");
  if (!(object.values?.length === 1 && object.values[0].toLowerCase() === "'none'")) {
    findings.push({ severity: "medium", message: "Set object-src 'none' to block plugin content in <object> and <embed>, which can bypass script-src." });
  }

  if (!byName.has("base-uri")) {
    findings.push({ severity: "medium", message: "No base-uri: an injected <base> tag can redirect relative script URLs to another origin. Add base-uri 'none' (or 'self')." });
  }
  if (!byName.has("frame-ancestors")) {
    findings.push({ severity: "low", message: "No frame-ancestors: any site may embed this page in a frame unless X-Frame-Options is set. Add frame-ancestors 'none' or 'self' to prevent clickjacking." });
  }
  if (!byName.has("form-action")) {
    findings.push({ severity: "low", message: "No form-action: forms may be submitted to any URL. Add form-action 'self' to stop injected forms posting data elsewhere." });
  }

  const insecure = new Set<string>();
  for (const [name, values] of byName) {
    if (SPECS[name].kind !== "fetch" && name !== "form-action" && name !== "frame-ancestors" && name !== "base-uri") continue;
    for (const value of values) if (/^http:(\/\/|$)/i.test(value)) insecure.add(name);
  }
  if (insecure.size > 0) {
    findings.push({ severity: "medium", message: `${[...insecure].join(", ")} ${insecure.size === 1 ? "allows" : "allow"} plain http:// sources, which a network attacker can tamper with.` });
  }

  if (reportOnly && !byName.has("report-uri") && !byName.has("report-to")) {
    findings.push({ severity: "medium", message: "This is a report-only policy with no report-uri or report-to, so it neither blocks nor reports anything." });
  }

  return findings;
}

/** Suggests a known directive for common misspellings such as `script_src` or `scriptsrc`. */
function suggest(name: string): string | null {
  const squash = (s: string) => s.replace(/[^a-z]/g, "");
  const target = squash(name);
  if (!target) return null;
  return Object.keys(SPECS).find((known) => squash(known) === target) ?? null;
}
