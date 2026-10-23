import { err, ok, type ToolResult } from "./result";

export type EscapeOptions = {
  /** Wrap the result in double quotes, making it a complete JSON string literal. */
  quotes?: boolean;
  /** Also write every character outside printable ASCII as a \uXXXX escape. */
  asciiOnly?: boolean;
};

function hex4(code: number): string {
  return `\\u${code.toString(16).padStart(4, "0")}`;
}

/**
 * Escapes text so it can sit between the double quotes of a JSON string.
 * `JSON.stringify` already produces the shortest valid form (and escapes lone
 * surrogates rather than emitting invalid UTF-16), so the work here is only
 * the optional ASCII-only pass. That pass works on UTF-16 code units, which
 * is what JSON's \u escape addresses: an emoji becomes a surrogate pair.
 */
export function escapeJsonString(input: string, options: EscapeOptions = {}): string {
  let literal = JSON.stringify(input);
  if (options.asciiOnly) {
    literal = literal.replace(/[^\x20-\x7e]/g, (ch) => hex4(ch.charCodeAt(0)));
  }
  return options.quotes ? literal : literal.slice(1, -1);
}

const SIMPLE_ESCAPES: Record<string, string> = {
  '"': '"',
  "\\": "\\",
  "/": "/",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
};

function locate(input: string, offset: number): string {
  const before = input.slice(0, offset);
  const line = before.split("\n").length;
  const column = offset - before.lastIndexOf("\n");
  return `line ${line}, column ${column}`;
}

/**
 * Decodes the escape sequences of a JSON string. The input may be a complete
 * literal with its surrounding quotes or just the text between them, which is
 * how escaped JSON usually turns up in logs. Unlike `JSON.parse`, raw line
 * breaks and tabs are kept rather than rejected, since pasted text often
 * wraps; an unknown escape or a stray unescaped quote is still an error,
 * because it means the input is not what the user thinks it is.
 */
export function unescapeJsonString(input: string): ToolResult<string> {
  const quoted = input.length >= 2 && input.startsWith('"') && input.endsWith('"');
  const start = quoted ? 1 : 0;
  const end = quoted ? input.length - 1 : input.length;

  let out = "";
  for (let i = start; i < end; i++) {
    const ch = input[i];

    if (ch === '"') {
      return err(
        `Unescaped double quote at ${locate(input, i)}. Inside a JSON string a quote must be written as \\"`,
      );
    }
    if (ch !== "\\") {
      out += ch;
      continue;
    }

    const next = input[i + 1];
    if (i + 1 >= end) {
      return err(`The input ends in the middle of an escape sequence at ${locate(input, i)}`);
    }
    if (Object.hasOwn(SIMPLE_ESCAPES, next)) {
      out += SIMPLE_ESCAPES[next];
      i += 1;
      continue;
    }
    if (next === "u") {
      const digits = input.slice(i + 2, Math.min(i + 6, end));
      if (!/^[0-9a-fA-F]{4}$/.test(digits)) {
        return err(`\\u must be followed by four hex digits, at ${locate(input, i)}`);
      }
      out += String.fromCharCode(parseInt(digits, 16));
      i += 5;
      continue;
    }
    return err(
      `\\${next} is not a valid JSON escape, at ${locate(input, i)}. JSON allows \\" \\\\ \\/ \\b \\f \\n \\r \\t and \\uXXXX`,
    );
  }

  return ok(out);
}
