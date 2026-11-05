import { err, messageOf, ok, type ToolResult } from "./result";

export type QueryStringDirection = "query-to-json" | "json-to-query";

/** How arrays of plain values are written when building a query string. */
export type QueryArrayFormat = "repeat" | "brackets";

export type QueryStringOptions = {
  /** Read `user[name]=x` and `tags[]=a` as nested objects and arrays. */
  nested: boolean;
  arrayFormat: QueryArrayFormat;
};

export const DEFAULT_QUERY_STRING_OPTIONS: QueryStringOptions = {
  nested: true,
  arrayFormat: "repeat",
};

export type QueryStringConversion = {
  output: string;
  /** Things that converted but are worth knowing, e.g. a malformed escape. */
  warnings: string[];
};

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

/**
 * Objects are built without a prototype so a parameter named `__proto__` or
 * `constructor` becomes an ordinary key instead of touching Object.prototype.
 */
function emptyObject(): JsonObject {
  return Object.create(null) as JsonObject;
}

function isObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Takes a bare query string, one starting with `?`, or a whole URL, and
 * returns just the part between `?` and `#`.
 */
export function extractQuery(input: string): string {
  let query = input.trim();
  const hash = query.indexOf("#");
  if (hash !== -1) query = query.slice(0, hash);
  const mark = query.indexOf("?");
  if (mark !== -1) return query.slice(mark + 1);
  // A URL with no `?` has no query at all; anything else is taken as a bare query.
  return /^[a-z][a-z\d+.-]*:\/\//i.test(query) ? "" : query;
}

/**
 * Decodes one key or value the way HTML forms and URLSearchParams do: `+` is a
 * space and `%XX` sequences are UTF-8 bytes. A malformed escape is kept as
 * written rather than failing the whole conversion.
 */
function decodeComponent(raw: string, warnings: string[]): string {
  const spaced = raw.replace(/\+/g, " ");
  try {
    return decodeURIComponent(spaced);
  } catch {
    warnings.push(`"${raw}" contains a malformed % escape and was kept as written.`);
    return spaced;
  }
}

/**
 * Splits `user[address][city]` into `["user", "address", "city"]` and
 * `tags[]` into `["tags", ""]`. A key whose brackets do not form a clean
 * `[...]` chain is returned whole, so it stays a literal flat key.
 */
export function parseKeyPath(key: string): string[] {
  const open = key.indexOf("[");
  if (open <= 0) return [key];
  const rest = key.slice(open);
  if (!/^(\[[^[\]]*\])+$/.test(rest)) return [key];
  const segments = [...rest.matchAll(/\[([^[\]]*)\]/g)].map((m) => m[1]);
  return [key.slice(0, open), ...segments];
}

const INDEX = /^(0|[1-9]\d{0,3})$/;

/** Appends to an existing key, turning a single value into a list on the second sighting. */
function addFlat(target: JsonObject, key: string, value: string) {
  const existing = target[key];
  if (existing === undefined) target[key] = value;
  else if (Array.isArray(existing)) existing.push(value);
  else target[key] = [existing, value];
}

/**
 * Writes `value` at `path` inside `root`, creating arrays for `[]` and numeric
 * segments and objects for named ones. Returns false when the path collides
 * with something already set, such as `a=1` followed by `a[b]=2`.
 */
function assignPath(root: JsonObject, path: string[], value: string): boolean {
  let container: JsonObject | JsonValue[] = root;

  for (let i = 0; i < path.length; i++) {
    const segment = path[i];
    const last = i === path.length - 1;

    if (Array.isArray(container)) {
      if (segment !== "" && !INDEX.test(segment)) return false;
      const index: number = segment === "" ? container.length : Number(segment);
      if (last) {
        if (container[index] !== undefined) return false;
        container[index] = value;
        return true;
      }
      const next: JsonValue | undefined = container[index];
      if (next === undefined) {
        const created: JsonObject | JsonValue[] = childFor(path[i + 1]);
        container[index] = created;
        container = created;
      } else if (typeof next === "object" && next !== null) {
        container = next;
      } else {
        return false;
      }
      continue;
    }

    if (last) {
      if (segment === "" || isObject(container[segment])) return false;
      addFlat(container, segment, value);
      return true;
    }
    const next: JsonValue | undefined = container[segment];
    if (next === undefined) {
      const created: JsonObject | JsonValue[] = childFor(path[i + 1]);
      container[segment] = created;
      container = created;
    } else if (typeof next === "object" && next !== null) {
      container = next;
    } else {
      return false;
    }
  }
  return false;
}

function childFor(nextSegment: string): JsonObject | JsonValue[] {
  return nextSegment === "" || INDEX.test(nextSegment) ? [] : emptyObject();
}

/** Removes holes left by indices such as `a[0]` and `a[5]`, keeping order. */
function compactArrays(value: JsonValue): { value: JsonValue; compacted: boolean } {
  let compacted = false;
  if (Array.isArray(value)) {
    const out: JsonValue[] = [];
    for (let i = 0; i < value.length; i++) {
      if (!(i in value)) {
        compacted = true;
        continue;
      }
      const child = compactArrays(value[i]);
      compacted ||= child.compacted;
      out.push(child.value);
    }
    return { value: out, compacted };
  }
  if (isObject(value)) {
    for (const key of Object.keys(value)) {
      const child = compactArrays(value[key]);
      compacted ||= child.compacted;
      value[key] = child.value;
    }
  }
  return { value, compacted };
}

/**
 * Converts a query string to a JSON object. Values are always strings, since
 * a query string carries no types. A key that appears more than once becomes
 * an array in order. With `nested`, PHP/Rails/qs-style bracket keys build
 * nested objects and arrays.
 */
export function queryToJson(
  input: string,
  options: Pick<QueryStringOptions, "nested"> = DEFAULT_QUERY_STRING_OPTIONS,
  indent = 2,
): ToolResult<QueryStringConversion> {
  const query = extractQuery(input);
  if (!query) return ok({ output: input.trim() ? "{}" : "", warnings: [] });

  const warnings: string[] = [];
  const result = emptyObject();

  for (const pair of query.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawValue = eq === -1 ? "" : pair.slice(eq + 1);
    const key = decodeComponent(rawKey, warnings);
    const value = decodeComponent(rawValue, warnings);

    if (!key) {
      warnings.push(`Skipped "${pair}" because it has no parameter name.`);
      continue;
    }

    if (!options.nested) {
      addFlat(result, key, value);
      continue;
    }

    if (!assignPath(result, parseKeyPath(key), value)) {
      warnings.push(`Skipped "${key}" because it conflicts with an earlier parameter of the same name.`);
    }
  }

  const { compacted } = compactArrays(result);
  if (compacted) {
    warnings.push("Array indices had gaps, so the arrays were closed up and keep only the values given.");
  }

  return ok({ output: JSON.stringify(result, null, indent), warnings });
}

/**
 * Encodes a key or value for a query string. Brackets in the structural part
 * of a key are added afterwards and left readable; everything inside a name or
 * value is percent-encoded, with spaces as `%20`.
 */
function encode(value: string): string {
  return encodeURIComponent(value);
}

function scalarText(value: string | number | boolean | null): string {
  return value === null ? "" : String(value);
}

/**
 * Converts a JSON object to a query string. Nested objects use bracket keys
 * (`user[name]=x`). Arrays of plain values are written as repeated keys or as
 * `key[]=` depending on `arrayFormat`; array elements that are themselves
 * objects or arrays always get an index so they read back unambiguously.
 */
export function jsonToQuery(
  input: string,
  options: Pick<QueryStringOptions, "arrayFormat"> = DEFAULT_QUERY_STRING_OPTIONS,
): ToolResult<QueryStringConversion> {
  if (!input.trim()) return ok({ output: "", warnings: [] });

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (e) {
    return err(`Invalid JSON: ${messageOf(e, "could not parse input")}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return err("Expected a JSON object such as {\"q\": \"search\"}; each top-level key becomes a parameter name.");
  }

  const pairs: string[] = [];
  const warnings: string[] = [];

  function walk(prefix: string, value: JsonValue, topLevel: boolean) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        warnings.push(`"${prefix}" is an empty array, which a query string cannot represent, so it was left out.`);
        return;
      }
      value.forEach((item, index) => {
        if (typeof item === "object" && item !== null) {
          walk(`${prefix}[${index}]`, item, false);
        } else {
          const key = options.arrayFormat === "brackets" ? `${prefix}[]` : prefix;
          pairs.push(`${key}=${encode(scalarText(item))}`);
        }
      });
      return;
    }
    if (isObject(value)) {
      const keys = Object.keys(value);
      if (keys.length === 0) {
        warnings.push(`"${prefix}" is an empty object, which a query string cannot represent, so it was left out.`);
        return;
      }
      for (const key of keys) {
        walk(topLevel ? encode(key) : `${prefix}[${encode(key)}]`, value[key], false);
      }
      return;
    }
    pairs.push(`${prefix}=${encode(scalarText(value))}`);
  }

  walk("", parsed as JsonObject, true);
  return ok({ output: pairs.join("&"), warnings });
}

export function convertQueryString(
  input: string,
  direction: QueryStringDirection,
  options: QueryStringOptions = DEFAULT_QUERY_STRING_OPTIONS,
): ToolResult<QueryStringConversion> {
  return direction === "query-to-json" ? queryToJson(input, options) : jsonToQuery(input, options);
}
