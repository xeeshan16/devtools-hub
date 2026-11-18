import { err, ok, type ToolResult } from "./result";

/** One parameter of a link-value, in the order it was written. */
export type LinkParam = {
  /** Parameter name, lowercased; RFC 8288 parameter names are case-insensitive. */
  name: string;
  /** The value with quotes and escapes removed, or null for a bare parameter such as `crossorigin`. */
  value: string | null;
};

/** One relation type from a `rel` parameter. */
export type LinkRelation = {
  /** Registered relation types are lowercased; extension relation types (URIs) keep their case. */
  name: string;
  /** False for relation types that are neither registered with IANA nor extension URIs. */
  known: boolean;
  /** Plain-language meaning of the relation type. */
  description: string;
};

/** One link-value from a `Link` header: a target URI and its parameters. */
export type LinkValue = {
  /** The target URI exactly as written between the angle brackets. */
  target: string;
  /** False when the target is a relative reference, resolved against the request URL by clients. */
  absolute: boolean;
  /** Relation types from the first `rel` parameter; empty when it is missing. */
  relations: LinkRelation[];
  /** The human-readable label: `title*` (decoded) when present, otherwise `title`. */
  title: string | null;
  /** The `type` parameter: the media type the target is expected to have. */
  type: string | null;
  /** The `anchor` parameter: the context the link is about, when it is not the requested resource. */
  anchor: string | null;
  params: LinkParam[];
};

/** URLs of the pagination links (first, prev, next, last) and their `page` query parameter, if any. */
export type PageLink = {
  url: string;
  page: number | null;
};

export type Pagination = {
  first: PageLink | null;
  prev: PageLink | null;
  next: PageLink | null;
  last: PageLink | null;
};

export type LinkHeaderResult = {
  links: LinkValue[];
  /** Set when any link has a first, prev, previous, next or last relation, as in paginated REST APIs. */
  pagination: Pagination | null;
  /** Syntax mistakes, ignored parameters and links clients cannot use. */
  warnings: string[];
};

const PREFIX = /^(?:[<>]\s*)?link\s*:\s*/i;
const EXAMPLE = '<https://api.example.com/items?page=2>; rel="next"';
/** Parameters RFC 8288 §3 says must not repeat; occurrences after the first are ignored. */
const SINGLE = new Set(["rel", "title", "title*", "type", "media", "anchor"]);

/** Registered relation types (IANA Link Relations registry and HTML) with plain-language meanings. */
const RELATIONS: Record<string, string> = {
  alternate: "An alternate version of this resource, e.g. a translation (with hreflang) or another format (with type).",
  author: "Information about the author of this resource.",
  canonical: "The preferred URL for this content; search engines index it instead of the requested URL.",
  collection: "The collection this resource is a member of.",
  "dns-prefetch": "Hints that the browser should resolve the target's DNS name early.",
  describedby: "A resource that describes this one, e.g. a JSON Schema or metadata document.",
  edit: "A URL for editing this resource.",
  first: "The first page of a paginated list.",
  help: "Help for this resource.",
  icon: "An icon representing this resource.",
  item: "A member of this collection.",
  last: "The last page of a paginated list.",
  latest: "The latest version of this resource.",
  license: "The license that applies to this resource.",
  manifest: "The web app manifest.",
  modulepreload: "Tells the browser to fetch and parse a JavaScript module early.",
  next: "The next page of a paginated list, or the next resource in a series.",
  nofollow: "The current document's author does not endorse the target.",
  preconnect: "Hints that the browser should open a connection to the target origin early.",
  "predecessor-version": "The previous version of this resource in a version history.",
  prefetch: "Hints that the target will probably be needed for a future navigation, so it can be fetched at low priority.",
  preload: "Tells the browser to fetch the target early because the current page needs it; requires an as parameter.",
  prev: "The previous page of a paginated list, or the previous resource in a series.",
  previous: "The previous page of a paginated list (a synonym of prev).",
  "privacy-policy": "The privacy policy that applies to this resource.",
  related: "A related resource.",
  replies: "Replies to this resource, e.g. comments.",
  search: "A search interface for this resource and related ones.",
  self: "The resource itself, as a canonical identifier for it.",
  "service-desc": "A machine-readable description of the API, e.g. an OpenAPI document.",
  "service-doc": "Human-readable documentation for the API.",
  stylesheet: "A stylesheet for this resource.",
  "successor-version": "The next version of this resource in a version history.",
  "terms-of-service": "The terms of service that apply to this resource.",
  up: "The parent resource in a hierarchy.",
  "version-history": "The version history of this resource.",
  webmention: "An endpoint that accepts Webmention notifications for this resource.",
};

/**
 * Parses one or more `Link` header lines (optionally prefixed with the header
 * name or curl -v markers) following RFC 8288: comma-separated link-values,
 * each a URI reference in angle brackets followed by semicolon-separated
 * parameters whose values are tokens or quoted strings. Repeated header lines
 * are combined, as HTTP treats them as one comma-separated list.
 */
export function parseLinkHeader(input: string): ToolResult<LinkHeaderResult | null> {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim().replace(PREFIX, ""))
    .filter((line) => line !== "");
  if (lines.length === 0) return ok(null);

  const header = lines.join(", ");
  const warnings: string[] = [];
  const links: LinkValue[] = [];
  let pos = 0;

  while (pos < header.length) {
    while (pos < header.length && /[\s,]/.test(header[pos])) pos++;
    if (pos >= header.length) break;

    if (header[pos] !== "<") {
      const end = topLevelComma(header, pos);
      const chunk = header.slice(pos, end).trim();
      warnings.push(`"${chunk}" is not a link: the target URI must be in angle brackets, e.g. ${EXAMPLE}.`);
      pos = end;
      continue;
    }

    const close = header.indexOf(">", pos + 1);
    if (close === -1) {
      warnings.push(`"${header.slice(pos).trim()}" has no closing ">", so the rest of the header can't be parsed.`);
      break;
    }
    const target = header.slice(pos + 1, close).trim();
    pos = close + 1;

    const params: LinkParam[] = [];
    while (pos < header.length) {
      while (pos < header.length && /\s/.test(header[pos])) pos++;
      if (pos >= header.length || header[pos] === ",") break;
      if (header[pos] !== ";") {
        const end = nextDelimiter(header, pos);
        warnings.push(`Unexpected "${header.slice(pos, end).trim()}" after <${target}>; parameters must start with a semicolon.`);
        pos = end;
        continue;
      }
      pos++;
      while (pos < header.length && /\s/.test(header[pos])) pos++;

      const nameStart = pos;
      while (pos < header.length && !/[=;,\s]/.test(header[pos])) pos++;
      const name = header.slice(nameStart, pos).toLowerCase();
      while (pos < header.length && /\s/.test(header[pos])) pos++;

      let value: string | null = null;
      if (header[pos] === "=") {
        pos++;
        while (pos < header.length && /\s/.test(header[pos])) pos++;
        if (header[pos] === '"') {
          const quoted = readQuoted(header, pos);
          if (!quoted.closed) warnings.push(`The ${name || "parameter"} value starting at "${header.slice(pos, pos + 20)}" has no closing quote.`);
          value = quoted.value;
          pos = quoted.end;
        } else {
          const end = nextDelimiter(header, pos);
          value = header.slice(pos, end).trim();
          pos = end;
          if (/\s/.test(value)) {
            warnings.push(`The ${name} value "${value}" contains spaces, so it must be in double quotes.`);
          }
        }
      }
      if (name) params.push({ name, value });
    }

    links.push(describeLink(target, params, warnings));
  }

  if (links.length === 0) {
    return err(`No links found. A Link header looks like: ${EXAMPLE}`);
  }

  return ok({ links, pagination: paginate(links), warnings });
}

function describeLink(target: string, params: LinkParam[], warnings: string[]): LinkValue {
  const label = `<${target}>`;
  const first = new Map<string, string | null>();
  for (const { name, value } of params) {
    if (SINGLE.has(name) && first.has(name)) {
      warnings.push(`${label} has more than one ${name} parameter; RFC 8288 says clients ignore every one after the first.`);
      continue;
    }
    if (!first.has(name)) first.set(name, value);
  }

  if (target === "") warnings.push("A link has an empty target (<>), which refers to the requested resource itself.");

  const rel = first.get("rel");
  const relations: LinkRelation[] = [];
  if (rel === undefined) {
    warnings.push(`${label} has no rel parameter, so clients can't tell what the link means.`);
  } else if (!rel || rel.trim() === "") {
    warnings.push(`${label} has an empty rel parameter, so clients can't tell what the link means.`);
  } else {
    for (const raw of rel.trim().split(/\s+/)) relations.push(describeRelation(raw));
    const unknown = relations.filter((relation) => !relation.known).map((relation) => relation.name);
    if (unknown.length > 0) {
      warnings.push(
        `${label}: ${unknown.map((name) => `"${name}"`).join(", ")} ${unknown.length === 1 ? "is" : "are"} not a registered relation type; custom types should be absolute URIs.`,
      );
    }
  }

  if (first.has("rev")) {
    warnings.push(`${label} uses rev, which RFC 8288 deprecates; express the relation with rel on a link in the other direction.`);
  }
  if (relations.some((relation) => relation.name === "preload") && !first.get("as")) {
    warnings.push(`${label} is a preload without an as parameter (e.g. as=style or as=script); browsers ignore it.`);
  }

  let title = first.get("title") ?? null;
  const extTitle = first.get("title*");
  if (extTitle) {
    const decoded = decodeExtValue(extTitle);
    if (decoded === null) {
      warnings.push(`${label} has a title* that isn't in the charset'lang'value form, e.g. title*=UTF-8''caf%C3%A9.`);
    } else {
      title = decoded;
    }
  }

  return {
    target,
    absolute: /^[a-z][a-z\d+.-]*:/i.test(target),
    relations,
    title,
    type: first.get("type") ?? null,
    anchor: first.get("anchor") ?? null,
    params,
  };
}

function describeRelation(raw: string): LinkRelation {
  if (/^[a-z][a-z\d+.-]*:/i.test(raw)) {
    return { name: raw, known: true, description: "An extension relation type, identified by this URI." };
  }
  const name = raw.toLowerCase();
  const description = RELATIONS[name];
  return description
    ? { name, known: true, description }
    : { name, known: false, description: "Not a registered relation type; clients that don't know it ignore the link." };
}

function paginate(links: LinkValue[]): Pagination | null {
  const find = (...names: string[]): PageLink | null => {
    const link = links.find((candidate) => candidate.relations.some((relation) => names.includes(relation.name)));
    return link ? { url: link.target, page: pageNumber(link.target) } : null;
  };
  const pagination = { first: find("first"), prev: find("prev", "previous"), next: find("next"), last: find("last") };
  return pagination.first || pagination.prev || pagination.next || pagination.last ? pagination : null;
}

/** The `page` query parameter as a whole number, if the URL has one. */
function pageNumber(target: string): number | null {
  try {
    const page = new URL(target, "https://example.invalid/").searchParams.get("page");
    return page !== null && /^\d+$/.test(page) ? Number(page) : null;
  } catch {
    return null;
  }
}

/** Decodes an RFC 8187 ext-value such as `UTF-8'en'%E2%82%AC%20rates`; null when malformed. */
export function decodeExtValue(value: string): string | null {
  const match = /^([^']*)'([^']*)'(.*)$/.exec(value);
  if (!match) return null;
  const charset = match[1].toLowerCase();
  try {
    if (charset === "utf-8") return decodeURIComponent(match[3]);
    if (charset === "iso-8859-1") {
      return match[3].replace(/%([\da-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
    }
  } catch {
    return null;
  }
  return null;
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
  return scan(header, start, (ch) => ch === ";" || ch === ",");
}

/** Index of the next `,` outside quotes and angle brackets, or the end of the header. */
function topLevelComma(header: string, start: number): number {
  return scan(header, start, (ch) => ch === ",");
}

function scan(header: string, start: number, stop: (ch: string) => boolean): number {
  let inQuotes = false;
  let inBrackets = false;
  for (let i = start; i < header.length; i++) {
    const ch = header[i];
    if (inQuotes) {
      if (ch === "\\") i++;
      else if (ch === '"') inQuotes = false;
      continue;
    }
    if (inBrackets) {
      if (ch === ">") inBrackets = false;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === "<") inBrackets = true;
    else if (stop(ch)) return i;
  }
  return header.length;
}
