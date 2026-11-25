import { locateJsonError } from "./json-formatter";
import { err, messageOf, ok, type ToolResult } from "./result";

export type JsonType = "object" | "array" | "string" | "number" | "boolean" | "null";

export type PointerEntry = {
  /** JSON Pointer string, e.g. `/users/0/name`. */
  pointer: string;
  type: JsonType;
  /** Short one-line rendering of the value for lists. */
  preview: string;
};

export type PointerMatch = {
  tokens: string[];
  /** Canonical pointer string rebuilt from the tokens. */
  pointer: string;
  /** The same pointer as a URI fragment (RFC 6901 §6), e.g. `#/a~1b/%20`. */
  fragment: string;
  type: JsonType;
  /** The referenced value, pretty-printed with two-space indentation. */
  json: string;
};

/** Escapes one reference token: `~` becomes `~0` and `/` becomes `~1`, in that order. */
export function escapeToken(token: string): string {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}

/** Builds a pointer string from unescaped reference tokens. */
export function formatPointer(tokens: readonly string[]): string {
  return tokens.map((token) => `/${escapeToken(token)}`).join("");
}

/** Builds the URI fragment form, percent-encoding characters a fragment can't hold. */
export function toFragment(tokens: readonly string[]): string {
  return `#${tokens.map((token) => `/${encodeURIComponent(escapeToken(token))}`).join("")}`;
}

/**
 * Splits a pointer into unescaped reference tokens. Accepts the plain string
 * form (`/a~1b`) and the URI fragment form (`#/a~1b`, percent-decoded first).
 * The empty string, or a lone `#`, points at the whole document.
 */
export function parsePointer(input: string): ToolResult<string[]> {
  let pointer = input;
  if (pointer.startsWith("#")) {
    try {
      pointer = decodeURIComponent(pointer.slice(1));
    } catch {
      return err("Invalid percent-encoding in the URI fragment.");
    }
  }
  if (pointer === "") return ok([]);
  if (!pointer.startsWith("/")) {
    return err(`A JSON Pointer must be empty or start with "/". Did you mean "/${pointer}"?`);
  }

  const tokens: string[] = [];
  for (const raw of pointer.slice(1).split("/")) {
    const bad = /~(?![01])/.exec(raw);
    if (bad) {
      return err(`Invalid escape in "${raw}": "~" must be followed by 0 (for ~) or 1 (for /).`);
    }
    // ~1 first, then ~0, so "~01" decodes to "~1" rather than "/".
    tokens.push(raw.replace(/~1/g, "/").replace(/~0/g, "~"));
  }
  return ok(tokens);
}

export function jsonType(value: unknown): JsonType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean") return type;
  return "object";
}

const ARRAY_INDEX = /^(0|[1-9][0-9]*)$/;

/**
 * Resolves reference tokens against a parsed document, following RFC 6901 §4:
 * array tokens must be decimal indexes without leading zeros, and `-` (the
 * element after the last) never exists when evaluating.
 */
export function resolvePointer(document: unknown, tokens: readonly string[]): ToolResult<unknown> {
  let current: unknown = document;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const at = i === 0 ? "the root" : `"${formatPointer(tokens.slice(0, i))}"`;

    if (Array.isArray(current)) {
      if (token === "-") {
        return err(`"-" at ${at} refers to the element after the last one, which only exists when adding (JSON Patch), not when reading.`);
      }
      if (!ARRAY_INDEX.test(token)) {
        return err(`The value at ${at} is an array, so "${token}" must be an index like 0 or 12 (no leading zeros or signs).`);
      }
      const index = Number(token);
      if (index >= current.length) {
        return err(`Index ${index} is out of range: the array at ${at} has ${current.length} item${current.length === 1 ? "" : "s"}.`);
      }
      current = current[index];
    } else if (current !== null && typeof current === "object") {
      if (!Object.hasOwn(current, token)) {
        return err(`No member "${token}" in the object at ${at}.`);
      }
      current = (current as Record<string, unknown>)[token];
    } else {
      const kind = jsonType(current) === "null" ? "null" : `a ${jsonType(current)}`;
      return err(`The value at ${at} is ${kind}, so it has no child "${token}".`);
    }
  }
  return ok(current);
}

/** Parses a JSON document and evaluates a pointer against it. Empty JSON yields null. */
export function evaluateJsonPointer(json: string, pointer: string): ToolResult<PointerMatch | null> {
  if (!json.trim()) return ok(null);

  let document: unknown;
  try {
    document = JSON.parse(json);
  } catch (e) {
    return err(locateJsonError(json, messageOf(e, "Invalid JSON")));
  }

  const tokens = parsePointer(pointer.trim());
  if (!tokens.ok) return tokens;

  const value = resolvePointer(document, tokens.value);
  if (!value.ok) return value;

  return ok({
    tokens: tokens.value,
    pointer: formatPointer(tokens.value),
    fragment: toFragment(tokens.value),
    type: jsonType(value.value),
    json: JSON.stringify(value.value, null, 2),
  });
}

function preview(value: unknown): string {
  if (Array.isArray(value)) return `[${value.length} item${value.length === 1 ? "" : "s"}]`;
  if (value !== null && typeof value === "object") {
    const count = Object.keys(value).length;
    return `{${count} key${count === 1 ? "" : "s"}}`;
  }
  const text = JSON.stringify(value);
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}

/**
 * Lists the pointer to every value in a document, depth first in document
 * order, starting with the root (""). Stops after `limit` entries so a huge
 * document can't freeze the page; `truncated` says whether it did.
 */
export function listPointers(document: unknown, limit = 1000): { entries: PointerEntry[]; truncated: boolean } {
  const entries: PointerEntry[] = [];
  let truncated = false;

  function visit(value: unknown, pointer: string): void {
    if (entries.length >= limit) {
      truncated = true;
      return;
    }
    entries.push({ pointer, type: jsonType(value), preview: preview(value) });
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${pointer}/${index}`));
    } else if (value !== null && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) visit(child, `${pointer}/${escapeToken(key)}`);
    }
  }

  visit(document, "");
  return { entries, truncated };
}
