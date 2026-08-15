import { err, messageOf, ok, type ToolResult } from "./result";

export type IndentStyle = "2" | "4" | "tab" | "minify";

const INDENT: Record<Exclude<IndentStyle, "minify">, string | number> = {
  "2": 2,
  "4": 4,
  tab: "\t",
};

/**
 * `JSON.parse` errors read like "Unexpected token } in JSON at position 42",
 * which is accurate but hard to act on. This maps the character offset onto a
 * line/column so the message points at somewhere the user can actually look.
 */
function locate(input: string, message: string): string {
  const match = /at position (\d+)/.exec(message);
  if (!match) return message;

  const position = Math.min(Number(match[1]), input.length);
  const before = input.slice(0, position);
  const line = before.split("\n").length;
  const column = position - before.lastIndexOf("\n");

  return `${message.replace(/ at position \d+/, "")} (line ${line}, column ${column})`;
}

export function formatJson(
  input: string,
  style: IndentStyle = "2",
): ToolResult<string> {
  if (!input.trim()) return ok("");

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (e) {
    return err(locate(input, messageOf(e, "Invalid JSON")));
  }

  return ok(
    style === "minify"
      ? JSON.stringify(parsed)
      : JSON.stringify(parsed, null, INDENT[style]),
  );
}

export function validateJson(input: string): ToolResult<true> {
  if (!input.trim()) return ok(true);
  try {
    JSON.parse(input);
    return ok(true);
  } catch (e) {
    return err(locate(input, messageOf(e, "Invalid JSON")));
  }
}

export type JsonStats = {
  keys: number;
  depth: number;
  arrays: number;
  objects: number;
  bytes: number;
};

/** Cheap structural summary shown under the output panel. */
export function jsonStats(input: string): JsonStats | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return null;
  }

  const stats: JsonStats = {
    keys: 0,
    depth: 0,
    arrays: 0,
    objects: 0,
    bytes: new TextEncoder().encode(input).length,
  };

  // Depth counts container nesting only. Counting scalar leaves too would make
  // a flat `{"a":1}` report depth 2, which is not what anyone means by depth.
  const walk = (node: unknown, depth: number) => {
    if (Array.isArray(node)) {
      if (depth > stats.depth) stats.depth = depth;
      stats.arrays += 1;
      for (const item of node) walk(item, depth + 1);
      return;
    }

    if (node !== null && typeof node === "object") {
      if (depth > stats.depth) stats.depth = depth;
      stats.objects += 1;
      for (const value of Object.values(node)) {
        stats.keys += 1;
        walk(value, depth + 1);
      }
    }
  };

  walk(parsed, 1);
  return stats;
}
