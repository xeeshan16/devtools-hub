import { err, ok, type ToolResult } from "./result";

export type StatusClass = 1 | 2 | 3 | 4 | 5;

export type StatusCode = {
  code: number;
  /** Reason phrase as registered with IANA. */
  name: string;
  /** Older or informal names that people still search for. */
  aliases: string[];
  /** One or two plain sentences on what it means and when to send it. */
  description: string;
  /** Defining specification, e.g. "RFC 9110 §15.5.5". */
  spec: string;
  /** Marked obsolete or reserved by its registry entry. */
  deprecated?: boolean;
};

export type StatusClassInfo = {
  class: StatusClass;
  label: string;
  description: string;
};

export const STATUS_CLASSES: readonly StatusClassInfo[] = [
  { class: 1, label: "Informational", description: "The request was received and processing continues; a final response follows." },
  { class: 2, label: "Success", description: "The request was received, understood and accepted." },
  { class: 3, label: "Redirection", description: "The client must take further action, usually following another URL, to complete the request." },
  { class: 4, label: "Client error", description: "The request is wrong in some way the client can fix: bad syntax, missing credentials, wrong resource." },
  { class: 5, label: "Server error", description: "The request looked valid but the server, or a server behind it, failed to fulfil it." },
];

/**
 * RFC 9110 §15.1: responses with these codes may be cached heuristically,
 * without explicit freshness headers. Everything else needs Cache-Control or
 * Expires to be stored.
 */
const HEURISTICALLY_CACHEABLE = new Set([200, 203, 204, 206, 300, 301, 308, 404, 405, 410, 414, 501]);

/** The IANA HTTP Status Code Registry, minus unassigned ranges. */
export const STATUS_CODES: readonly StatusCode[] = [
  { code: 100, name: "Continue", aliases: [], spec: "RFC 9110 §15.2.1", description: "The server has received the request headers and the client should send the body. Sent in reply to Expect: 100-continue so a large upload can be refused before it is sent." },
  { code: 101, name: "Switching Protocols", aliases: [], spec: "RFC 9110 §15.2.2", description: "The server agrees to the client's Upgrade request and switches protocol on this connection, most often to WebSocket." },
  { code: 102, name: "Processing", aliases: [], spec: "RFC 2518", deprecated: true, description: "WebDAV interim response saying a long request is still being worked on. Removed from later WebDAV specifications and rarely sent today." },
  { code: 103, name: "Early Hints", aliases: [], spec: "RFC 8297", description: "Sent before the final response with Link headers, so the browser can start preloading stylesheets and scripts while the server is still generating the page." },

  { code: 200, name: "OK", aliases: [], spec: "RFC 9110 §15.3.1", description: "The request succeeded. The body holds the requested resource for GET, or the result of the action for POST." },
  { code: 201, name: "Created", aliases: [], spec: "RFC 9110 §15.3.2", description: "The request succeeded and created a new resource. The Location header should point at it." },
  { code: 202, name: "Accepted", aliases: [], spec: "RFC 9110 §15.3.3", description: "The request was accepted for processing but has not finished. Common for queued or asynchronous jobs; the outcome is reported some other way." },
  { code: 203, name: "Non-Authoritative Information", aliases: [], spec: "RFC 9110 §15.3.4", description: "The request succeeded, but a transforming proxy modified the response from the origin server." },
  { code: 204, name: "No Content", aliases: [], spec: "RFC 9110 §15.3.5", description: "The request succeeded and there is deliberately no body. Typical for DELETE, or a PUT that does not echo the resource back." },
  { code: 205, name: "Reset Content", aliases: [], spec: "RFC 9110 §15.3.6", description: "The request succeeded and the client should reset the document view, for example clear a form for the next entry." },
  { code: 206, name: "Partial Content", aliases: [], spec: "RFC 9110 §15.3.7", description: "The server is returning only the byte ranges asked for in the Range header. Used for resumable downloads and video seeking." },
  { code: 207, name: "Multi-Status", aliases: [], spec: "RFC 4918", description: "WebDAV: the body is an XML document with a separate status for each of several resources affected by the request." },
  { code: 208, name: "Already Reported", aliases: [], spec: "RFC 5842", description: "WebDAV: inside a 207 response, marks members of a binding already listed earlier so they are not repeated." },
  { code: 226, name: "IM Used", aliases: [], spec: "RFC 3229", description: "The server applied instance manipulations, such as a delta encoding, to the resource and the body is the result." },

  { code: 300, name: "Multiple Choices", aliases: [], spec: "RFC 9110 §15.4.1", description: "The resource has several representations and the client, or the user, should pick one. Rarely used in practice." },
  { code: 301, name: "Moved Permanently", aliases: [], spec: "RFC 9110 §15.4.2", description: "The resource has a new permanent URL, given in Location. Clients may change a POST into a GET when following it; use 308 to keep the method." },
  { code: 302, name: "Found", aliases: ["Moved Temporarily"], spec: "RFC 9110 §15.4.3", description: "The resource is temporarily at the URL in Location. Clients may change a POST into a GET when following it; use 307 to keep the method." },
  { code: 303, name: "See Other", aliases: [], spec: "RFC 9110 §15.4.4", description: "The result is at another URL that should be fetched with GET. The usual reply after a form POST, so a refresh does not resubmit it." },
  { code: 304, name: "Not Modified", aliases: [], spec: "RFC 9110 §15.4.5", description: "Reply to a conditional GET (If-None-Match or If-Modified-Since): the cached copy is still valid, so no body is sent." },
  { code: 305, name: "Use Proxy", aliases: [], spec: "RFC 9110 §15.4.6", deprecated: true, description: "Deprecated for security reasons; clients ignore it." },
  { code: 306, name: "(Unused)", aliases: ["Switch Proxy"], spec: "RFC 9110 §15.4.7", deprecated: true, description: "Defined in an early draft and no longer used. The code is reserved." },
  { code: 307, name: "Temporary Redirect", aliases: [], spec: "RFC 9110 §15.4.8", description: "The resource is temporarily at the URL in Location, and the client must repeat the request with the same method and body." },
  { code: 308, name: "Permanent Redirect", aliases: [], spec: "RFC 9110 §15.4.9", description: "The resource has a new permanent URL, and the client must repeat the request with the same method and body." },

  { code: 400, name: "Bad Request", aliases: [], spec: "RFC 9110 §15.5.1", description: "The server cannot process the request because it is malformed: invalid syntax, bad framing or a value it cannot parse." },
  { code: 401, name: "Unauthorized", aliases: [], spec: "RFC 9110 §15.5.2", description: "The request lacks valid credentials. Despite the name it means unauthenticated; the response must carry a WWW-Authenticate header saying how to log in." },
  { code: 402, name: "Payment Required", aliases: [], spec: "RFC 9110 §15.5.3", description: "Reserved for future use. Some APIs send it when a quota or subscription has run out." },
  { code: 403, name: "Forbidden", aliases: [], spec: "RFC 9110 §15.5.4", description: "The server understood who you are, or does not care, and refuses the request. Logging in again will not help." },
  { code: 404, name: "Not Found", aliases: [], spec: "RFC 9110 §15.5.5", description: "The server has nothing at this URL, or will not admit that it does. It may exist later." },
  { code: 405, name: "Method Not Allowed", aliases: [], spec: "RFC 9110 §15.5.6", description: "The resource exists but does not support this method. The response must include an Allow header listing the methods that work." },
  { code: 406, name: "Not Acceptable", aliases: [], spec: "RFC 9110 §15.5.7", description: "The server cannot produce a response matching the request's Accept, Accept-Language or Accept-Encoding headers." },
  { code: 407, name: "Proxy Authentication Required", aliases: [], spec: "RFC 9110 §15.5.8", description: "Like 401, but the credentials are for a proxy in between; it sends a Proxy-Authenticate header." },
  { code: 408, name: "Request Timeout", aliases: [], spec: "RFC 9110 §15.5.9", description: "The server gave up waiting for the client to finish sending the request. The client may retry on a new connection." },
  { code: 409, name: "Conflict", aliases: [], spec: "RFC 9110 §15.5.10", description: "The request conflicts with the current state of the resource, such as an edit based on an outdated version or a duplicate unique value." },
  { code: 410, name: "Gone", aliases: [], spec: "RFC 9110 §15.5.11", description: "The resource used to exist and has been removed for good. Unlike 404, this is permanent, so links and caches can drop it." },
  { code: 411, name: "Length Required", aliases: [], spec: "RFC 9110 §15.5.12", description: "The server refuses a request body sent without a Content-Length header." },
  { code: 412, name: "Precondition Failed", aliases: [], spec: "RFC 9110 §15.5.13", description: "A conditional header such as If-Match or If-Unmodified-Since was false. Used for optimistic locking: someone else changed the resource first." },
  { code: 413, name: "Content Too Large", aliases: ["Payload Too Large", "Request Entity Too Large"], spec: "RFC 9110 §15.5.14", description: "The request body is larger than the server is willing to accept. A Retry-After header means the limit is temporary." },
  { code: 414, name: "URI Too Long", aliases: ["Request-URI Too Long"], spec: "RFC 9110 §15.5.15", description: "The URL is longer than the server will handle, often a GET carrying too much data in its query string." },
  { code: 415, name: "Unsupported Media Type", aliases: [], spec: "RFC 9110 §15.5.16", description: "The server does not accept the request body's format, set by Content-Type or Content-Encoding. Common when JSON is sent without Content-Type: application/json." },
  { code: 416, name: "Range Not Satisfiable", aliases: ["Requested Range Not Satisfiable"], spec: "RFC 9110 §15.5.17", description: "None of the byte ranges in the Range header overlap the resource, for example a range past the end of the file." },
  { code: 417, name: "Expectation Failed", aliases: [], spec: "RFC 9110 §15.5.18", description: "The server cannot meet the request's Expect header." },
  { code: 418, name: "(Unused)", aliases: ["I'm a teapot"], spec: "RFC 9110 §15.5.19", deprecated: true, description: "Reserved because of the April Fools' RFC 2324 joke, 'I'm a teapot'. Some servers return it for fun; it has no defined meaning." },
  { code: 421, name: "Misdirected Request", aliases: [], spec: "RFC 9110 §15.5.20", description: "The request reached a server that cannot answer for this host, typically a reused HTTP/2 or HTTP/3 connection whose certificate covers several domains." },
  { code: 422, name: "Unprocessable Content", aliases: ["Unprocessable Entity"], spec: "RFC 9110 §15.5.21", description: "The body is well-formed but its content fails validation, such as a missing required field. Many JSON APIs use it for validation errors." },
  { code: 423, name: "Locked", aliases: [], spec: "RFC 4918", description: "WebDAV: the resource is locked and cannot be changed." },
  { code: 424, name: "Failed Dependency", aliases: [], spec: "RFC 4918", description: "WebDAV: the request failed because another action it depended on failed." },
  { code: 425, name: "Too Early", aliases: [], spec: "RFC 8470", description: "The server will not process a request sent in TLS early data (0-RTT), because it could be replayed." },
  { code: 426, name: "Upgrade Required", aliases: [], spec: "RFC 9110 §15.5.22", description: "The server refuses the request over the current protocol and names the one to switch to in an Upgrade header." },
  { code: 428, name: "Precondition Required", aliases: [], spec: "RFC 6585", description: "The server requires the request to be conditional, with If-Match for example, to stop clients overwriting each other's changes." },
  { code: 429, name: "Too Many Requests", aliases: [], spec: "RFC 6585", description: "The client has been rate limited. A Retry-After header says how long to wait before trying again." },
  { code: 431, name: "Request Header Fields Too Large", aliases: [], spec: "RFC 6585", description: "A single header, or all headers together, is too large. Oversized cookies are a frequent cause." },
  { code: 451, name: "Unavailable For Legal Reasons", aliases: [], spec: "RFC 7725", description: "The server is denying access because of a legal demand, such as a court order or government block." },

  { code: 500, name: "Internal Server Error", aliases: [], spec: "RFC 9110 §15.6.1", description: "A generic error: something went wrong on the server that no more specific code covers, often an unhandled exception." },
  { code: 501, name: "Not Implemented", aliases: [], spec: "RFC 9110 §15.6.2", description: "The server does not support the functionality needed, such as an unrecognised request method." },
  { code: 502, name: "Bad Gateway", aliases: [], spec: "RFC 9110 §15.6.3", description: "A gateway or proxy got an invalid response from the upstream server, for example the application crashed or closed the connection." },
  { code: 503, name: "Service Unavailable", aliases: [], spec: "RFC 9110 §15.6.4", description: "The server is temporarily unable to handle the request, because of overload or maintenance. A Retry-After header may say when to come back." },
  { code: 504, name: "Gateway Timeout", aliases: [], spec: "RFC 9110 §15.6.5", description: "A gateway or proxy did not get a response from the upstream server in time." },
  { code: 505, name: "HTTP Version Not Supported", aliases: [], spec: "RFC 9110 §15.6.6", description: "The server does not support the major HTTP version used in the request." },
  { code: 506, name: "Variant Also Negotiates", aliases: [], spec: "RFC 2295", description: "A server configuration error in transparent content negotiation: the chosen variant is itself set up to negotiate." },
  { code: 507, name: "Insufficient Storage", aliases: [], spec: "RFC 4918", description: "WebDAV: the server cannot store what is needed to complete the request." },
  { code: 508, name: "Loop Detected", aliases: [], spec: "RFC 5842", description: "WebDAV: the server found an infinite loop while processing a request with Depth: infinity." },
  { code: 510, name: "Not Extended", aliases: [], spec: "RFC 2774", deprecated: true, description: "The request needs an HTTP extension the server has not been told to use. The specification is historic." },
  { code: 511, name: "Network Authentication Required", aliases: [], spec: "RFC 6585", description: "The client must authenticate to gain network access. Sent by captive portals on public Wi-Fi, not by origin servers." },
];

const BY_CODE = new Map(STATUS_CODES.map((s) => [s.code, s]));

export function statusClassOf(code: number): StatusClassInfo {
  return STATUS_CLASSES[Math.floor(code / 100) - 1];
}

export function getStatusCode(code: number): StatusCode | undefined {
  return BY_CODE.get(code);
}

export function isHeuristicallyCacheable(code: number): boolean {
  return HEURISTICALLY_CACHEABLE.has(code);
}

export type StatusLookup = {
  matches: StatusCode[];
  /**
   * Set when the query is a valid three-digit code that is not registered.
   * RFC 9110 §15 says a client must treat such a code like the x00 of its
   * class, so a 499 is handled as a 400.
   */
  unregistered?: { code: number; class: StatusClassInfo; treatAs: StatusCode };
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function haystack(status: StatusCode): string {
  return normalize([status.name, ...status.aliases].join(" "));
}

/**
 * Finds status codes for a free-text query:
 * - empty: every registered code;
 * - a full code ("404"): that code, or class guidance if it is unregistered;
 * - a code prefix or class ("40", "5xx", "4"): every code that starts with it;
 * - words ("not found", "teapot"): codes whose name or alias contains every
 *   word, then codes whose description does, in code order within each group.
 */
export function lookupStatus(query: string, classFilter?: StatusClass): ToolResult<StatusLookup> {
  const inClass = (s: StatusCode) => classFilter === undefined || Math.floor(s.code / 100) === classFilter;
  const q = query.trim();

  if (q === "") return ok({ matches: STATUS_CODES.filter(inClass) });

  const classMatch = /^([1-5])(?:xx)$/i.exec(q);
  if (classMatch) {
    return ok({ matches: STATUS_CODES.filter((s) => String(s.code)[0] === classMatch[1] && inClass(s)) });
  }

  if (/^\d+$/.test(q)) {
    if (q.length > 3 || !/^[1-5]/.test(q)) {
      return err("HTTP status codes are three digits from 100 to 599.");
    }
    if (q.length === 3) {
      const code = Number(q);
      const found = BY_CODE.get(code);
      if (found) return ok({ matches: inClass(found) ? [found] : [] });
      const cls = statusClassOf(code);
      if (classFilter !== undefined && cls.class !== classFilter) return ok({ matches: [] });
      return ok({
        matches: [],
        unregistered: { code, class: cls, treatAs: BY_CODE.get(cls.class * 100)! },
      });
    }
    return ok({ matches: STATUS_CODES.filter((s) => String(s.code).startsWith(q) && inClass(s)) });
  }

  const words = normalize(q).split(" ").filter(Boolean);
  if (words.length === 0) return ok({ matches: STATUS_CODES.filter(inClass) });

  const containsAll = (text: string) => words.every((w) => text.includes(w));
  const byName: StatusCode[] = [];
  const byDescription: StatusCode[] = [];
  for (const status of STATUS_CODES) {
    if (!inClass(status)) continue;
    if (containsAll(haystack(status))) byName.push(status);
    else if (containsAll(normalize(`${status.description} ${status.spec}`))) byDescription.push(status);
  }
  return ok({ matches: [...byName, ...byDescription] });
}

/** "404 Not Found", the form people paste into code and tickets. */
export function formatStatusLine(status: StatusCode): string {
  return `${status.code} ${status.name}`;
}
