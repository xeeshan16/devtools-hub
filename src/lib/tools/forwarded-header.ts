import { err, ok, type ToolResult } from "./result";

/** What a `for` or `by` node identifies, following the node syntax of RFC 7239 §6. */
export type NodeKind = "ipv4" | "ipv6" | "obfuscated" | "unknown" | "invalid";

/** Where an IP address lives; null for nodes that are not IP addresses. */
export type AddressScope = "public" | "private" | "loopback" | "link-local" | null;

/** A `for` or `by` value: an IP address, an obfuscated identifier or "unknown", with an optional port. */
export type ForwardedNode = {
  /** The value with quotes removed, exactly as written otherwise. */
  raw: string;
  kind: NodeKind;
  /** The address or identifier without brackets and port; null for "unknown" and invalid nodes. */
  address: string | null;
  /** A port number or an obfuscated port such as `_8080`; null when absent. */
  port: string | null;
  scope: AddressScope;
};

/** One name=value pair, in the order it was written. */
export type ForwardedPair = {
  /** Parameter name, lowercased; RFC 7239 parameter names are case-insensitive. */
  name: string;
  /** The value with quotes and escapes removed. */
  value: string;
};

/** One forwarded-element: what a single proxy recorded about the request it received. */
export type ForwardedElement = {
  pairs: ForwardedPair[];
  /** The client or previous proxy that sent the request to this proxy. */
  for: ForwardedNode | null;
  /** The interface on which this proxy received the request. */
  by: ForwardedNode | null;
  /** The Host header the proxy received. */
  host: string | null;
  /** The scheme the request arrived with, lowercased, e.g. "https". */
  proto: string | null;
};

export type ForwardedResult = {
  /** In the order proxies appended them: the first element was added by the proxy closest to the client. */
  elements: ForwardedElement[];
  /** The `for` node of the first element: the original client, if every proxy in the chain is trusted. */
  client: ForwardedNode | null;
  /** Syntax mistakes and values recipients will reject or misread. */
  warnings: string[];
};

const PREFIX = /^(?:[<>]\s*)?forwarded\s*:\s*/i;
const TOKEN = /^[!#$%&'*+\-.^_`|~\dA-Za-z]+$/;
const SCHEME = /^[a-z][a-z\d+.-]*$/i;
const OBFUSCATED = /^_[\dA-Za-z._-]+$/;
const KNOWN = new Set(["for", "by", "host", "proto"]);
const EXAMPLE = 'for=192.0.2.60;proto=https;by=203.0.113.43';

/**
 * Parses one or more `Forwarded` header lines (optionally prefixed with the
 * header name or curl -v markers) following RFC 7239: comma-separated
 * forwarded-elements, one per proxy, each a list of semicolon-separated
 * name=value pairs whose values are tokens or quoted strings. Repeated header
 * lines are combined, as HTTP treats them as one comma-separated list.
 */
export function parseForwarded(input: string): ToolResult<ForwardedResult | null> {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim().replace(PREFIX, ""))
    .filter((line) => line !== "");
  if (lines.length === 0) return ok(null);

  const header = lines.join(", ");
  const warnings: string[] = [];
  const elements: ForwardedElement[] = [];
  let pos = 0;

  while (pos < header.length) {
    const pairs: ForwardedPair[] = [];
    while (pos < header.length && header[pos] !== ",") {
      while (pos < header.length && /[\s;]/.test(header[pos])) pos++;
      if (pos >= header.length || header[pos] === ",") break;

      const nameStart = pos;
      while (pos < header.length && !/[=;,\s]/.test(header[pos])) pos++;
      const name = header.slice(nameStart, pos).toLowerCase();
      while (pos < header.length && /\s/.test(header[pos])) pos++;

      if (header[pos] !== "=") {
        const end = nextDelimiter(header, pos);
        const chunk = header.slice(nameStart, end).trim();
        warnings.push(`"${chunk}" is not a name=value pair, e.g. ${EXAMPLE}.`);
        pos = end;
        continue;
      }
      pos++;
      while (pos < header.length && /\s/.test(header[pos])) pos++;

      let value: string;
      if (header[pos] === '"') {
        const quoted = readQuoted(header, pos);
        if (!quoted.closed) warnings.push(`The ${name || "parameter"} value starting at "${header.slice(pos, pos + 20)}" has no closing quote.`);
        value = quoted.value;
        pos = quoted.end;
      } else {
        const end = nextDelimiter(header, pos);
        value = header.slice(pos, end).trim();
        pos = end;
        if (value !== "" && !TOKEN.test(value)) {
          warnings.push(`The ${name} value ${value} contains characters such as ":" or "[" that aren't allowed in a token, so it must be in double quotes: ${name}="${value}".`);
        }
      }

      if (!name) {
        warnings.push(`A value "${value}" has no parameter name.`);
        continue;
      }
      pairs.push({ name, value });
    }
    if (header[pos] === ",") pos++;
    if (pairs.length > 0) elements.push(describeElement(pairs, elements.length, warnings));
  }

  if (elements.length === 0) {
    return err(`No forwarded elements found. A Forwarded header looks like: ${EXAMPLE}`);
  }

  return ok({ elements, client: elements[0].for, warnings });
}

function describeElement(pairs: ForwardedPair[], index: number, warnings: string[]): ForwardedElement {
  const label = `Element ${index + 1}`;
  const first = new Map<string, string>();
  for (const { name, value } of pairs) {
    if (first.has(name)) {
      warnings.push(`${label} has more than one ${name} parameter; RFC 7239 forbids repeating a parameter within one element.`);
      continue;
    }
    first.set(name, value);
    if (!KNOWN.has(name)) {
      warnings.push(`${label}: "${name}" is not a standard parameter (for, by, host, proto); recipients that don't know it ignore it.`);
    }
  }

  const node = (name: "for" | "by"): ForwardedNode | null => {
    const value = first.get(name);
    if (value === undefined) return null;
    const parsed = parseNode(value);
    if (parsed.kind === "invalid") warnings.push(`${label}: ${name}=${quoteIfNeeded(value)} ${invalidReason(value)}`);
    return parsed;
  };

  const forNode = node("for");
  const byNode = node("by");

  let proto = first.get("proto") ?? null;
  if (proto !== null) {
    if (!SCHEME.test(proto)) warnings.push(`${label}: proto=${quoteIfNeeded(proto)} is not a URI scheme such as http or https.`);
    else proto = proto.toLowerCase();
  }

  const host = first.get("host") ?? null;
  if (host !== null && (host === "" || /[\s/@]/.test(host))) {
    warnings.push(`${label}: host=${quoteIfNeeded(host)} is not a valid Host value; it should be a host name or address with an optional port.`);
  }

  return { pairs, for: forNode, by: byNode, host, proto };
}

/** Parses a node: IPv4, a bracketed IPv6 address, "unknown" or an obfuscated identifier, each with an optional port. */
export function parseNode(raw: string): ForwardedNode {
  const invalid: ForwardedNode = { raw, kind: "invalid", address: null, port: null, scope: null };
  let name = raw;
  let port: string | null = null;

  if (raw.startsWith("[")) {
    const close = raw.indexOf("]");
    if (close === -1) return invalid;
    name = raw.slice(0, close + 1);
    const rest = raw.slice(close + 1);
    if (rest !== "") {
      if (!rest.startsWith(":")) return invalid;
      port = rest.slice(1);
    }
  } else {
    const colons = raw.split(":").length - 1;
    if (colons > 1) return invalid;
    if (colons === 1) {
      const at = raw.indexOf(":");
      name = raw.slice(0, at);
      port = raw.slice(at + 1);
    }
  }

  if (port !== null && !validPort(port)) return invalid;

  if (name.toLowerCase() === "unknown") return { raw, kind: "unknown", address: null, port, scope: null };
  if (OBFUSCATED.test(name)) return { raw, kind: "obfuscated", address: name, port, scope: null };
  if (name.startsWith("[") && name.endsWith("]")) {
    const address = name.slice(1, -1);
    return isIPv6(address) ? { raw, kind: "ipv6", address, port, scope: ipv6Scope(address) } : invalid;
  }
  const octets = ipv4Octets(name);
  return octets ? { raw, kind: "ipv4", address: name, port, scope: ipv4Scope(octets) } : invalid;
}

function invalidReason(value: string): string {
  if (!value.startsWith("[") && value.split(":").length - 1 > 1) {
    return 'looks like an IPv6 address; it must be in square brackets and quoted, e.g. for="[2001:db8::1]".';
  }
  const port = /:([^:\]]*)$/.exec(value);
  if (port && !value.endsWith("]") && !validPort(port[1])) {
    return "has an invalid port; ports are 1 to 65535 or an obfuscated identifier such as _8080.";
  }
  return "is not an IPv4 address, a bracketed IPv6 address, \"unknown\" or an obfuscated identifier starting with _.";
}

function validPort(port: string): boolean {
  if (OBFUSCATED.test(port)) return true;
  return /^\d{1,5}$/.test(port) && Number(port) >= 1 && Number(port) <= 65535;
}

function ipv4Octets(text: string): number[] | null {
  const parts = text.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => (/^(?:0|[1-9]\d{0,2})$/.test(part) ? Number(part) : NaN));
  return octets.every((octet) => octet <= 255) ? octets : null;
}

function ipv4Scope([a, b]: number[]): AddressScope {
  if (a === 127) return "loopback";
  if (a === 169 && b === 254) return "link-local";
  if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) {
    return "private";
  }
  return "public";
}

function isIPv6(address: string): boolean {
  if (!address.includes(":") || !/^[\da-f:.]+$/i.test(address)) return false;
  try {
    new URL(`http://[${address}]/`);
    return true;
  } catch {
    return false;
  }
}

function ipv6Scope(address: string): AddressScope {
  const normalized = new URL(`http://[${address}]/`).hostname.slice(1, -1).toLowerCase();
  if (normalized === "::1") return "loopback";
  const mapped = /^::ffff:([\da-f]{1,4}):([\da-f]{1,4})$/.exec(normalized);
  if (mapped) {
    const high = parseInt(mapped[1], 16);
    const low = parseInt(mapped[2], 16);
    return ipv4Scope([high >> 8, high & 255, low >> 8, low & 255]);
  }
  const head = parseInt(normalized.split(":")[0] || "0", 16);
  if ((head & 0xfe00) === 0xfc00) return "private";
  if ((head & 0xffc0) === 0xfe80) return "link-local";
  return "public";
}

export type XForwardedHeaders = {
  /** The X-Forwarded-For value: comma-separated addresses, client first. */
  forwardedFor: string;
  /** The X-Forwarded-Proto value, e.g. "https". */
  proto: string;
  /** The X-Forwarded-Host value, e.g. "example.com". */
  host: string;
};

/**
 * Converts the de facto X-Forwarded-For, X-Forwarded-Proto and X-Forwarded-Host
 * headers into one standard Forwarded header value. Each X-Forwarded-For entry
 * becomes its own element; proto and host describe the request the first proxy
 * received, so they join the client's element. Returns null when every input is empty.
 */
export function buildForwarded({ forwardedFor, proto, host }: XForwardedHeaders): ToolResult<string | null> {
  const addresses = forwardedFor
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
  const scheme = proto.trim();
  const hostValue = host.trim();
  if (addresses.length === 0 && scheme === "" && hostValue === "") return ok(null);

  const nodes: string[] = [];
  for (const address of addresses) {
    const node = xffNode(address);
    if (node === null) return err(`"${address}" in X-Forwarded-For is not an IP address (optionally with a port) or "unknown".`);
    nodes.push(node);
  }
  if (scheme !== "" && !SCHEME.test(scheme)) return err(`"${scheme}" is not a URI scheme such as http or https.`);
  if (hostValue !== "" && /[\s,/@;"]/.test(hostValue)) return err(`"${hostValue}" is not a valid host; use a host name or address with an optional port.`);

  const firstPairs: string[] = [];
  if (nodes.length > 0) firstPairs.push(`for=${quoteIfNeeded(nodes[0])}`);
  if (hostValue !== "") firstPairs.push(`host=${quoteIfNeeded(hostValue)}`);
  if (scheme !== "") firstPairs.push(`proto=${scheme.toLowerCase()}`);

  const elements = [firstPairs.join(";"), ...nodes.slice(1).map((node) => `for=${quoteIfNeeded(node)}`)];
  return ok(elements.join(", "));
}

/** Rewrites one X-Forwarded-For entry in Forwarded node syntax, bracketing IPv6; null when it isn't an address. */
function xffNode(entry: string): string | null {
  if (entry.toLowerCase() === "unknown") return "unknown";
  if (isIPv6(entry)) return `[${entry}]`;
  const parsed = parseNode(entry);
  if (parsed.kind === "ipv4" || parsed.kind === "ipv6") return entry;
  return null;
}

function quoteIfNeeded(value: string): string {
  return TOKEN.test(value) ? value : `"${value.replace(/(["\\])/g, "\\$1")}"`;
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

/** Index of the next `;` or `,` outside quotes, or the end of the header. */
function nextDelimiter(header: string, start: number): number {
  let inQuotes = false;
  for (let i = start; i < header.length; i++) {
    const ch = header[i];
    if (inQuotes) {
      if (ch === "\\") i++;
      else if (ch === '"') inQuotes = false;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ";" || ch === ",") return i;
  }
  return header.length;
}
