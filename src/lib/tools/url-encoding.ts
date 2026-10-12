import { err, ok, type ToolResult } from "./result";

/**
 * `component` escapes everything outside the unreserved set, which is what a
 * single query value or path segment needs. `uri` keeps the characters that
 * give a whole URL its structure (`:/?#[]@&=+$,;`) so the URL still works.
 */
export type EncodeScope = "component" | "uri";

export type EncodeOptions = {
  scope?: EncodeScope;
  /**
   * HTML form encoding (`application/x-www-form-urlencoded`) writes spaces as
   * `+`. Only meaningful for a component: in a full URL a `+` in the path is a
   * literal plus, so it is ignored when `scope` is `uri`.
   */
  plusForSpace?: boolean;
};

export type DecodeOptions = {
  /** Read `+` as a space, as form-encoded query strings require. */
  plusAsSpace?: boolean;
};

export function encodeUrl(input: string, options: EncodeOptions = {}): ToolResult<string> {
  const { scope = "component", plusForSpace = false } = options;
  if (!input) return ok("");

  let encoded: string;
  try {
    encoded = scope === "uri" ? encodeURI(input) : encodeURIComponent(input);
  } catch {
    // The only failure mode of encodeURI/encodeURIComponent is a lone surrogate.
    return err(
      "Input contains an unpaired surrogate character, which cannot be represented as UTF-8.",
    );
  }

  return ok(scope === "component" && plusForSpace ? encoded.replace(/%20/g, "+") : encoded);
}

/** A `%` that is not followed by exactly two hex digits. */
const MALFORMED_ESCAPE = /%(?![0-9A-Fa-f]{2})/;
/** A run of consecutive percent-escapes — one multi-byte character lives in one run. */
const ESCAPE_RUN = /(?:%[0-9A-Fa-f]{2})+/g;

export function decodeUrl(input: string, options: DecodeOptions = {}): ToolResult<string> {
  const trimmed = input.trim();
  if (!trimmed) return ok("");

  const source = options.plusAsSpace ? trimmed.replace(/\+/g, " ") : trimmed;

  const malformed = MALFORMED_ESCAPE.exec(source);
  if (malformed) {
    const snippet = source.slice(malformed.index, malformed.index + 3);
    return err(
      `Malformed escape "${snippet}" at position ${malformed.index + 1}: a % must be followed by two hex digits. Encode a literal percent sign as %25.`,
    );
  }

  try {
    return ok(decodeURIComponent(source));
  } catch {
    // Every escape is well-formed, so some run of bytes is not valid UTF-8.
    // Decode each run on its own to point at the one that fails.
    for (const run of source.matchAll(ESCAPE_RUN)) {
      try {
        decodeURIComponent(run[0]);
      } catch {
        return err(
          `The escapes starting at position ${(run.index ?? 0) + 1} ("${truncate(run[0])}") do not form valid UTF-8 text.`,
        );
      }
    }
    return err("The percent-escapes do not form valid UTF-8 text.");
  }
}

function truncate(value: string, max = 24): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
