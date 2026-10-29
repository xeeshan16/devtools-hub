import { encodeBase64 } from "./base64";
import { err, ok, type ToolResult } from "./result";

export type FormField = {
  name: string;
  value: string;
  /** True for `-F name=@path`: the value is a file path curl would upload. */
  file: boolean;
};

export type CurlBody =
  | { kind: "text"; value: string }
  | { kind: "form"; fields: FormField[] };

export type CurlRequest = {
  url: string;
  method: string;
  /** In the order given, names as written; repeated names are kept. */
  headers: [string, string][];
  body: CurlBody | null;
  /** From `-m` / `--max-time`. */
  timeoutMs: number | null;
};

export type CurlConversion = {
  request: CurlRequest;
  code: string;
  /** Options that fetch cannot express, or that were ignored. */
  warnings: string[];
};

type Tokenized = { tokens: string[]; stoppedAt: string | null };

const OPERATORS = new Set(["|", ";", "&", "<", ">"]);
const ANSI_ESCAPES: Record<string, string> = {
  a: "\x07",
  b: "\b",
  e: "\x1b",
  E: "\x1b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
  v: "\v",
  "\\": "\\",
  "'": "'",
  '"': '"',
  "?": "?",
};

/**
 * Splits a command line the way a POSIX shell would: single quotes are
 * literal, double quotes honour `\"`, `\\`, `\$` and `` \` ``, `$'…'` decodes
 * C escapes, and a backslash before a line break joins the lines. Variables
 * are not expanded. An unquoted `|`, `;`, `&`, `<` or `>` ends the command.
 */
export function tokenizeShell(input: string): ToolResult<Tokenized> {
  const tokens: string[] = [];
  let current = "";
  let inToken = false;
  let i = 0;

  const finish = () => {
    if (inToken) tokens.push(current);
    current = "";
    inToken = false;
  };

  while (i < input.length) {
    const ch = input[i];

    if (ch === "\\") {
      if (input[i + 1] === "\n") {
        i += 2;
        continue;
      }
      if (input[i + 1] === "\r" && input[i + 2] === "\n") {
        i += 3;
        continue;
      }
      if (i + 1 < input.length) current += input[i + 1];
      inToken = true;
      i += 2;
      continue;
    }

    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      finish();
      i++;
      continue;
    }

    if (ch === "#" && !inToken) {
      while (i < input.length && input[i] !== "\n") i++;
      continue;
    }

    if (OPERATORS.has(ch)) {
      finish();
      return ok({ tokens, stoppedAt: ch });
    }

    if (ch === "'") {
      const end = input.indexOf("'", i + 1);
      if (end === -1) return err("Unterminated single quote.");
      current += input.slice(i + 1, end);
      inToken = true;
      i = end + 1;
      continue;
    }

    if (ch === "$" && input[i + 1] === "'") {
      i += 2;
      let closed = false;
      while (i < input.length) {
        const c = input[i];
        if (c === "'") {
          closed = true;
          i++;
          break;
        }
        if (c === "\\" && i + 1 < input.length) {
          const next = input[i + 1];
          const hex = next === "x" ? /^[0-9a-fA-F]{1,2}/.exec(input.slice(i + 2)) : null;
          const uni =
            next === "u" || next === "U"
              ? new RegExp(`^[0-9a-fA-F]{1,${next === "u" ? 4 : 8}}`).exec(input.slice(i + 2))
              : null;
          if (hex) {
            current += String.fromCharCode(parseInt(hex[0], 16));
            i += 2 + hex[0].length;
          } else if (uni && parseInt(uni[0], 16) <= 0x10ffff) {
            current += String.fromCodePoint(parseInt(uni[0], 16));
            i += 2 + uni[0].length;
          } else if (next in ANSI_ESCAPES) {
            current += ANSI_ESCAPES[next];
            i += 2;
          } else {
            current += c + next;
            i += 2;
          }
          continue;
        }
        current += c;
        i++;
      }
      if (!closed) return err("Unterminated $'…' quote.");
      inToken = true;
      continue;
    }

    if (ch === '"') {
      i++;
      let closed = false;
      while (i < input.length) {
        const c = input[i];
        if (c === '"') {
          closed = true;
          i++;
          break;
        }
        if (c === "\\" && i + 1 < input.length) {
          const next = input[i + 1];
          if (next === "\n") {
            i += 2;
            continue;
          }
          if (next === '"' || next === "\\" || next === "$" || next === "`") {
            current += next;
            i += 2;
            continue;
          }
        }
        current += c;
        i++;
      }
      if (!closed) return err("Unterminated double quote.");
      inToken = true;
      continue;
    }

    current += ch;
    inToken = true;
    i++;
  }

  finish();
  return ok({ tokens, stoppedAt: null });
}

const SHORT_OPTIONS: Record<string, string> = {
  X: "request",
  H: "header",
  d: "data",
  u: "user",
  A: "user-agent",
  e: "referer",
  b: "cookie",
  F: "form",
  G: "get",
  I: "head",
  L: "location",
  k: "insecure",
  s: "silent",
  S: "show-error",
  v: "verbose",
  i: "include",
  o: "output",
  O: "remote-name",
  m: "max-time",
  x: "proxy",
  T: "upload-file",
  r: "range",
  w: "write-out",
  f: "fail",
  c: "cookie-jar",
  E: "cert",
  D: "dump-header",
  K: "config",
  U: "proxy-user",
  g: "globoff",
  N: "no-buffer",
  "#": "progress-bar",
  "4": "ipv4",
  "6": "ipv6",
};

/** Long options that consume the next argument. */
const TAKES_VALUE = new Set([
  "request",
  "header",
  "data",
  "data-raw",
  "data-binary",
  "data-ascii",
  "data-urlencode",
  "json",
  "user",
  "user-agent",
  "referer",
  "cookie",
  "form",
  "form-string",
  "url",
  "output",
  "max-time",
  "connect-timeout",
  "proxy",
  "proxy-user",
  "upload-file",
  "range",
  "write-out",
  "cookie-jar",
  "cert",
  "key",
  "cacert",
  "capath",
  "retry",
  "retry-delay",
  "retry-max-time",
  "oauth2-bearer",
  "resolve",
  "connect-to",
  "interface",
  "limit-rate",
  "max-redirs",
  "dump-header",
  "config",
  "unix-socket",
  "aws-sigv4",
  "ciphers",
  "pass",
  "cert-type",
  "key-type",
  "trace",
  "trace-ascii",
  "stderr",
  "time-cond",
  "continue-at",
  "keepalive-time",
  "expect100-timeout",
  "local-port",
  "dns-servers",
  "request-target",
  "variable",
]);

/** Options that change only curl's own output or behaviour fetch already has. */
const HARMLESS = new Set([
  "location",
  "compressed",
  "silent",
  "show-error",
  "verbose",
  "include",
  "output",
  "remote-name",
  "write-out",
  "fail",
  "fail-with-body",
  "progress-bar",
  "no-progress-meter",
  "globoff",
  "no-buffer",
  "dump-header",
  "stderr",
  "trace",
  "trace-ascii",
  "http1.1",
  "http2",
  "http2-prior-knowledge",
  "http3",
  "ipv4",
  "ipv6",
  "max-redirs",
  "retry",
  "retry-delay",
  "retry-max-time",
  "connect-timeout",
  "keepalive-time",
  "tcp-nodelay",
  "path-as-is",
]);

const TLS_OPTIONS = new Set(["cert", "key", "cacert", "capath", "pass", "cert-type", "key-type", "ciphers"]);

/** Percent-encodes everything except RFC 3986 unreserved characters, as curl does. */
export function curlUrlEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function urlEncodeData(value: string, warn: (message: string) => void): string {
  const eq = value.indexOf("=");
  const at = value.indexOf("@");
  if (at !== -1 && (eq === -1 || at < eq)) {
    warn(`--data-urlencode ${value} reads a file, which this converter cannot do; the text was kept as written.`);
    return value;
  }
  if (eq === -1) return curlUrlEncode(value);
  const name = value.slice(0, eq);
  const content = curlUrlEncode(value.slice(eq + 1));
  return name ? `${name}=${content}` : content;
}

function hasHeader(headers: [string, string][], name: string): boolean {
  const lower = name.toLowerCase();
  return headers.some(([n]) => n.toLowerCase() === lower);
}

function isCurl(token: string): boolean {
  return /(^|[\\/])curl(\.exe)?$/i.test(token);
}

type DataPart = { value: string; json: boolean };

/**
 * Reads a curl command into the request it would send. Anything that cannot
 * be reproduced with fetch (client certificates, proxies, reading files) is
 * reported as a warning rather than silently dropped.
 */
export function parseCurl(input: string): ToolResult<{ request: CurlRequest; warnings: string[] } | null> {
  const trimmed = input.trim().replace(/^\$\s+/, "");
  if (!trimmed) return ok(null);

  const tokenized = tokenizeShell(trimmed);
  if (!tokenized.ok) return tokenized;
  const { tokens, stoppedAt } = tokenized.value;

  if (tokens.length === 0 || !isCurl(tokens[0])) {
    return err("Expected a command that starts with curl.");
  }

  const warnings: string[] = [];
  const warn = (message: string) => {
    if (!warnings.includes(message)) warnings.push(message);
  };
  if (stoppedAt) {
    warn(`Only the curl command was converted; everything from the first unquoted ${stoppedAt} on was ignored.`);
  }

  const urls: string[] = [];
  const headers: [string, string][] = [];
  const data: DataPart[] = [];
  const form: FormField[] = [];
  // Options are applied from a closure, so they live on one object that
  // TypeScript does not narrow away between assignments.
  const opts = {
    method: null as string | null,
    get: false,
    head: false,
    user: null as string | null,
    bearer: null as string | null,
    timeoutMs: null as number | null,
  };
  let optionsEnded = false;

  const apply = (name: string, display: string, value: string | undefined): ToolResult<void> => {
    if (TAKES_VALUE.has(name) && value === undefined) {
      return err(`${display} needs a value.`);
    }
    const v = value ?? "";
    switch (name) {
      case "request":
        opts.method = v;
        break;
      case "header": {
        if (v.startsWith("@")) {
          warn(`${display} ${v} reads headers from a file, which this converter cannot do.`);
          break;
        }
        const colon = v.indexOf(":");
        if (colon === -1) {
          if (v.endsWith(";")) headers.push([v.slice(0, -1).trim(), ""]);
          else warn(`Ignored the header "${v}": it has no colon.`);
          break;
        }
        const headerName = v.slice(0, colon).trim();
        const headerValue = v.slice(colon + 1).trim();
        // `-H "Accept:"` tells curl to drop a header it would add; there is nothing to send.
        if (headerName && headerValue) headers.push([headerName, headerValue]);
        break;
      }
      case "data":
      case "data-ascii":
      case "data-binary":
        if (v.startsWith("@")) {
          warn(`${display} ${v} reads the body from a file, which this converter cannot do; the text was kept as written.`);
        }
        data.push({ value: v, json: false });
        break;
      case "data-raw":
        data.push({ value: v, json: false });
        break;
      case "data-urlencode":
        data.push({ value: urlEncodeData(v, warn), json: false });
        break;
      case "json":
        if (v.startsWith("@")) {
          warn(`--json ${v} reads the body from a file, which this converter cannot do; the text was kept as written.`);
        }
        data.push({ value: v, json: true });
        break;
      case "form":
      case "form-string": {
        const eq = v.indexOf("=");
        if (eq === -1) return err(`${display} expects name=value, got "${v}".`);
        const fieldName = v.slice(0, eq);
        const fieldValue = v.slice(eq + 1);
        if (name === "form" && (fieldValue.startsWith("@") || fieldValue.startsWith("<"))) {
          form.push({ name: fieldName, value: fieldValue.slice(1).split(";")[0], file: true });
        } else {
          form.push({ name: fieldName, value: fieldValue, file: false });
        }
        break;
      }
      case "url":
        urls.push(v);
        break;
      case "user":
        opts.user = v;
        break;
      case "oauth2-bearer":
        opts.bearer = v;
        break;
      case "user-agent":
        headers.push(["User-Agent", v]);
        break;
      case "referer":
        headers.push(["Referer", v.replace(/;auto$/, "")]);
        break;
      case "cookie":
        if (v.includes("=")) headers.push(["Cookie", v]);
        else warn(`${display} ${v} names a cookie file, which this converter cannot read.`);
        break;
      case "range":
        headers.push(["Range", `bytes=${v}`]);
        break;
      case "get":
        opts.get = true;
        break;
      case "head":
        opts.head = true;
        break;
      case "max-time": {
        const seconds = Number(v);
        if (Number.isFinite(seconds) && seconds > 0) opts.timeoutMs = Math.round(seconds * 1000);
        else warn(`Ignored ${display} ${v}: not a positive number of seconds.`);
        break;
      }
      case "insecure":
        warn("-k / --insecure has no fetch equivalent: fetch always verifies TLS certificates.");
        break;
      case "proxy":
      case "proxy-user":
        warn(`${display} has no fetch equivalent; configure the proxy in your runtime instead.`);
        break;
      case "upload-file":
        warn(`${display} uploads a file, which this converter cannot read; send its contents as the body with method PUT.`);
        break;
      default:
        if (TLS_OPTIONS.has(name)) {
          warn(`${display} sets TLS client options, which fetch cannot express.`);
        } else if (!HARMLESS.has(name)) {
          warn(`${display} is not supported and was ignored.`);
        }
    }
    return ok(undefined);
  };

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];

    if (optionsEnded || !token.startsWith("-") || token === "-") {
      urls.push(token);
      continue;
    }

    if (token === "--") {
      optionsEnded = true;
      continue;
    }

    if (token.startsWith("--")) {
      const name = token.slice(2);
      const value = TAKES_VALUE.has(name) ? tokens[++i] : undefined;
      const result = apply(name, token, value);
      if (!result.ok) return result;
      continue;
    }

    // A cluster of short options such as -sSL or -XPOST.
    for (let j = 1; j < token.length; j++) {
      const flag = token[j];
      const name = SHORT_OPTIONS[flag];
      if (!name) {
        warn(`-${flag} is not supported and was ignored.`);
        continue;
      }
      if (TAKES_VALUE.has(name)) {
        const rest = token.slice(j + 1);
        const value = rest !== "" ? rest : tokens[++i];
        const result = apply(name, `-${flag}`, value);
        if (!result.ok) return result;
        break;
      }
      const result = apply(name, `-${flag}`, undefined);
      if (!result.ok) return result;
    }
  }

  if (urls.length === 0) return err("No URL found in the command.");
  if (urls.length > 1) warn(`The command has ${urls.length} URLs; only the first, ${urls[0]}, was converted.`);

  let url = urls[0];
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = `http://${url}`;

  if (data.length > 0 && form.length > 0) {
    return err("The command mixes -d and -F; curl rejects that too. Use one or the other.");
  }

  let body: CurlBody | null = null;
  let defaultMethod = opts.head ? "HEAD" : "GET";

  if (data.length > 0) {
    const allJson = data.every((part) => part.json);
    const joined = data.map((part) => part.value).join(allJson ? "" : "&");
    if (opts.get) {
      const hash = url.indexOf("#");
      const base = hash === -1 ? url : url.slice(0, hash);
      const fragment = hash === -1 ? "" : url.slice(hash);
      url = `${base}${base.includes("?") ? "&" : "?"}${joined}${fragment}`;
    } else {
      body = { kind: "text", value: joined };
      defaultMethod = opts.head ? "HEAD" : "POST";
      if (data.some((part) => part.json)) {
        if (!hasHeader(headers, "Content-Type")) headers.push(["Content-Type", "application/json"]);
        if (!hasHeader(headers, "Accept")) headers.push(["Accept", "application/json"]);
      } else if (!hasHeader(headers, "Content-Type")) {
        headers.push(["Content-Type", "application/x-www-form-urlencoded"]);
      }
    }
  } else if (form.length > 0) {
    body = { kind: "form", fields: form };
    defaultMethod = "POST";
    const index = headers.findIndex(([n]) => n.toLowerCase() === "content-type");
    if (index !== -1) {
      headers.splice(index, 1);
      warn("Removed the Content-Type header: fetch sets multipart/form-data with the right boundary itself.");
    }
  }

  if (opts.bearer !== null && !hasHeader(headers, "Authorization")) {
    headers.push(["Authorization", `Bearer ${opts.bearer}`]);
  }
  if (opts.user !== null && !hasHeader(headers, "Authorization")) {
    const credentials = opts.user;
    if (!credentials.includes(":")) {
      warn(`-u ${credentials} has no password; curl would prompt for one. An empty password was used.`);
    }
    const encoded = encodeBase64(credentials.includes(":") ? credentials : `${credentials}:`);
    if (encoded.ok) headers.push(["Authorization", `Basic ${encoded.value}`]);
  }

  if (hasHeader(headers, "Cookie")) {
    warn("Browsers do not let fetch set the Cookie header; it works in Node.js, Deno and Bun.");
  }

  const finalMethod = opts.method ?? defaultMethod;
  if (body && /^(GET|HEAD)$/i.test(finalMethod)) {
    warn(`fetch throws when a ${finalMethod.toUpperCase()} request has a body; drop the body or change the method.`);
  }

  return ok({
    request: { url, method: finalMethod, headers, body, timeoutMs: opts.timeoutMs },
    warnings,
  });
}

function str(value: string): string {
  return JSON.stringify(value);
}

function mergedHeaders(headers: [string, string][]): [string, string][] {
  const merged = new Map<string, [string, string]>();
  for (const [name, value] of headers) {
    const key = name.toLowerCase();
    const existing = merged.get(key);
    if (existing) existing[1] += `${key === "cookie" ? "; " : ", "}${value}`;
    else merged.set(key, [name, value]);
  }
  return [...merged.values()];
}

function bodyExpression(body: string, headers: [string, string][]): string {
  const type = headers.find(([n]) => n.toLowerCase() === "content-type")?.[1] ?? "";
  if (/json/i.test(type)) {
    try {
      const parsed: unknown = JSON.parse(body);
      if (parsed !== null && typeof parsed === "object") {
        return `JSON.stringify(${JSON.stringify(parsed, null, 2).replace(/\n/g, "\n  ")})`;
      }
    } catch {
      // Not valid JSON: send it exactly as written.
    }
  }
  return str(body);
}

/** Renders the request as a JavaScript `fetch` call (browser, Node 18+, Deno, Bun). */
export function toFetch(request: CurlRequest): string {
  const lines: string[] = [];
  const options: string[] = [];
  const headers = mergedHeaders(request.headers);

  if (request.body?.kind === "form") {
    lines.push("const form = new FormData();");
    for (const field of request.body.fields) {
      if (field.file) {
        const fileName = field.value.split(/[\\/]/).pop() || field.value;
        lines.push(
          `form.append(${str(field.name)}, new Blob([/* contents of ${field.value.replace(/\*\//g, "* /")} */]), ${str(fileName)});`,
        );
      } else {
        lines.push(`form.append(${str(field.name)}, ${str(field.value)});`);
      }
    }
    lines.push("");
  }

  if (request.method !== "GET") {
    options.push(`  method: ${str(request.method)},`);
  }
  if (headers.length > 0) {
    options.push("  headers: {");
    for (const [name, value] of headers) options.push(`    ${str(name)}: ${str(value)},`);
    options.push("  },");
  }
  if (request.body?.kind === "text") {
    options.push(`  body: ${bodyExpression(request.body.value, headers)},`);
  } else if (request.body?.kind === "form") {
    options.push("  body: form,");
  }
  if (request.timeoutMs !== null) {
    options.push(`  signal: AbortSignal.timeout(${request.timeoutMs}),`);
  }

  if (options.length === 0) {
    lines.push(`const response = await fetch(${str(request.url)});`);
  } else {
    lines.push(`const response = await fetch(${str(request.url)}, {`, ...options, "});");
  }
  return lines.join("\n");
}

export function convertCurl(input: string): ToolResult<CurlConversion | null> {
  const parsed = parseCurl(input);
  if (!parsed.ok) return parsed;
  if (!parsed.value) return ok(null);
  const { request, warnings } = parsed.value;
  return ok({ request, code: toFetch(request), warnings });
}
