import { err, ok, type ToolResult } from "./result";

export type QueryParam = { key: string; value: string };

export type ParsedUrl = {
  /** The normalized URL as the WHATWG parser serializes it. */
  href: string;
  /** Scheme without the trailing colon, e.g. `https`. */
  scheme: string;
  /** True when the input had no scheme and `https://` was assumed. */
  assumedScheme: boolean;
  username: string;
  password: string;
  /** Host name without the port; IPv6 addresses keep their brackets. */
  hostname: string;
  /** The port as written, or empty when it is absent or the scheme's default. */
  port: string;
  /** The port a client actually connects to, filling in the scheme's default. */
  effectivePort: string;
  /** `scheme://host[:port]`, or `null` for schemes without an origin (mailto:, data:, file:). */
  origin: string | null;
  /** The path as it appears in the URL, still percent-encoded. */
  pathname: string;
  /** Path segments, percent-decoded. Empty for the root path. */
  pathSegments: string[];
  /** The raw query string without the leading `?`. */
  query: string;
  /** Decoded query parameters in order, repeated keys kept. */
  params: QueryParam[];
  /** The fragment without the leading `#`, percent-decoded. */
  fragment: string;
};

const DEFAULT_PORTS: Record<string, string> = {
  http: "80",
  https: "443",
  ws: "80",
  wss: "443",
  ftp: "21",
};

/** A scheme per RFC 3986: a letter, then letters, digits, `+`, `-` or `.`, then `:`. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
/**
 * `localhost:3000` or `example.com:8080/x` would parse as a scheme followed by
 * a path; they mean a host and port. Requiring a dot (or `localhost`) keeps
 * opaque URLs such as `tel:5551234` intact.
 */
const HOST_WITH_PORT = /^(?:localhost|[^/?#:@]*\.[^/?#:@]*):\d+(?:[/?#]|$)/i;

/**
 * Splits a URL into its parts using the same WHATWG parser browsers use, so
 * the result matches what `new URL()` and `fetch` would see. Input without a
 * scheme, such as `example.com/path`, is read as `https://` and flagged.
 */
export function parseUrl(input: string): ToolResult<ParsedUrl | null> {
  const trimmed = input.trim();
  if (!trimmed) return ok(null);

  if (/\s/.test(trimmed)) {
    return err(
      "URLs cannot contain spaces or line breaks. Encode a space as %20 (or + in a query string), or paste one URL at a time.",
    );
  }

  const assumedScheme =
    trimmed.startsWith("//") || !HAS_SCHEME.test(trimmed) || HOST_WITH_PORT.test(trimmed);
  const source = assumedScheme
    ? `https:${trimmed.startsWith("//") ? "" : "//"}${trimmed}`
    : trimmed;

  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return err(
      assumedScheme
        ? `"${truncate(trimmed)}" is not a valid URL or host name.`
        : `"${truncate(trimmed)}" is not a valid URL. Check the host name, the port (0–65535) and any brackets around an IPv6 address.`,
    );
  }

  const scheme = url.protocol.replace(/:$/, "");
  const origin = url.origin === "null" ? null : url.origin;

  return ok({
    href: url.href,
    scheme,
    assumedScheme,
    username: safeDecode(url.username),
    password: safeDecode(url.password),
    hostname: url.hostname,
    port: url.port,
    effectivePort: url.port || (url.hostname ? (DEFAULT_PORTS[scheme] ?? "") : ""),
    origin,
    pathname: url.pathname,
    pathSegments: url.pathname
      .split("/")
      .filter((segment) => segment !== "")
      .map(safeDecode),
    query: url.search.replace(/^\?/, ""),
    params: [...url.searchParams].map(([key, value]) => ({ key, value })),
    fragment: safeDecode(url.hash.replace(/^#/, "")),
  });
}

/** Decodes percent-escapes, leaving the text as it is if they are malformed. */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function truncate(value: string, max = 60): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
