import { err, ok, type ToolResult } from "./result";

/**
 * HTTP Basic authentication (RFC 7617) sends `Basic base64(user-id ":" password)`
 * in the Authorization header. The encoding is trivial, but the rules around
 * it are where requests silently fail: a colon in the user-id, control
 * characters, the UTF-8 vs ISO-8859-1 question and a scheme other than Basic.
 */

export type BasicAuthEncoded = {
  /** The base64 credentials on their own (the token68 part of the header). */
  token: string;
  /** The Authorization header value, `Basic <token>`. */
  value: string;
  /** The full header line, ready to paste into an HTTP client. */
  header: string;
  warnings: string[];
};

export type BasicAuthDecoded = {
  username: string;
  password: string;
  /** The header name when one was pasted, e.g. `Authorization` or `Proxy-Authorization`. */
  headerName: string | null;
  /** UTF-8 per RFC 7617, or ISO-8859-1 when the bytes are not valid UTF-8. */
  charset: "UTF-8" | "ISO-8859-1";
  warnings: string[];
};

// RFC 7617 section 2: user-id and password must not contain control
// characters (CTL, which is 0x00-0x1F and 0x7F).
const CONTROL = /[\u0000-\u001f\u007f]/;

function controlCharacterAt(value: string): number {
  return value.search(CONTROL);
}

function describeControl(ch: string): string {
  const code = ch.codePointAt(0) ?? 0;
  const names: Record<number, string> = { 9: "a tab", 10: "a line break", 13: "a carriage return" };
  return names[code] ?? `U+${code.toString(16).toUpperCase().padStart(4, "0")}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Builds the Authorization header for a username and password, encoded as UTF-8. */
export function encodeBasicAuth(username: string, password: string): ToolResult<BasicAuthEncoded> {
  const colon = username.indexOf(":");
  if (colon !== -1) {
    return err(
      `The username contains a colon at position ${colon + 1}. Basic auth joins username and password with a colon and servers split at the first one, so everything after it would be read as the password.`,
    );
  }
  for (const [label, field] of [["username", username], ["password", password]] as const) {
    const at = controlCharacterAt(field);
    if (at !== -1) {
      return err(
        `The ${label} contains ${describeControl(field[at])} at position ${at + 1}. Basic auth credentials cannot contain control characters.`,
      );
    }
  }

  const warnings: string[] = [];
  if (!username) warnings.push("The username is empty. Some APIs use an empty username with a key as the password, but most expect one.");
  if (!password) warnings.push("The password is empty. Some APIs put a key in the username and leave the password blank; check that yours does.");
  if (/[^ -~]/.test(username + password)) {
    warnings.push(
      "Non-ASCII characters are encoded as UTF-8, as RFC 7617 recommends. Older servers that expect ISO-8859-1 will see different bytes and reject the credentials.",
    );
  }

  const token = bytesToBase64(new TextEncoder().encode(`${username}:${password}`));
  const value = `Basic ${token}`;
  return ok({ token, value, header: `Authorization: ${value}`, warnings });
}

const HEADER_NAME = /^((?:proxy-)?authorization)\s*:\s*/i;

/**
 * Reads Basic credentials from a full header line (`Authorization: Basic …`
 * or `Proxy-Authorization: Basic …`), a header value (`Basic …`) or the bare
 * base64 token. The scheme name is case-insensitive.
 */
export function decodeBasicAuth(input: string): ToolResult<BasicAuthDecoded> {
  let rest = input.trim();
  if (!rest) return err("Paste an Authorization header, a Basic header value or the base64 credentials.");

  let headerName: string | null = null;
  const named = HEADER_NAME.exec(rest);
  if (named) {
    headerName = named[1];
    rest = rest.slice(named[0].length);
  }

  const parts = /^(\S+)\s+(\S.*)$/s.exec(rest);
  let token: string;
  if (parts) {
    const scheme = parts[1];
    if (scheme.toLowerCase() === "bearer") {
      return err("This is a Bearer token, not Basic credentials. If it starts with eyJ it is probably a JWT; paste it into the JWT Decoder.");
    }
    if (scheme.toLowerCase() !== "basic") {
      return err(`The "${scheme}" scheme does not carry a username and password in base64. Only the Basic scheme can be decoded here.`);
    }
    token = parts[2].trim();
    if (/\s/.test(token)) {
      return err("The credentials contain whitespace. A Basic header value is the word Basic, one space and a single base64 token.");
    }
  } else if (/^basic$/i.test(rest)) {
    return err("There are no credentials after Basic. The header value should be Basic followed by a space and the base64 token.");
  } else {
    token = rest;
  }

  const warnings: string[] = [];
  if (headerName && !parts) {
    warnings.push(`The ${headerName} header has no scheme. Servers expect Basic, a space, then the credentials.`);
  }
  if (parts && parts[1] !== "Basic") {
    warnings.push(`The scheme is written "${parts[1]}". It is case-insensitive, so servers should accept it, but "Basic" is the usual spelling.`);
  }

  if (/[-_]/.test(token) && !/[+/]/.test(token)) {
    return err("The credentials use the base64url alphabet (- and _). Basic auth uses standard base64 with + and /, so a server would reject this header.");
  }
  const invalid = token.search(/[^A-Za-z0-9+/=]/);
  if (invalid !== -1) {
    return err(`Unexpected character "${token[invalid]}" at position ${invalid + 1} of the credentials. Basic auth uses standard base64: A-Z, a-z, 0-9, + and /.`);
  }
  const firstPad = token.indexOf("=");
  const data = firstPad === -1 ? token : token.slice(0, firstPad);
  if (firstPad !== -1 && !/^={1,2}$/.test(token.slice(firstPad))) {
    return err("Padding (=) can only appear at the end of base64, at most twice.");
  }
  if (data.length % 4 === 1) {
    return err(`${data.length} base64 characters cannot be decoded: the value is probably truncated or has an extra character.`);
  }
  const expectedPadding = (4 - (data.length % 4)) % 4;
  const padding = firstPad === -1 ? 0 : token.length - firstPad;
  if (padding !== 0 && padding !== expectedPadding) {
    return err(`Found ${padding} padding character${padding === 1 ? "" : "s"}, but ${data.length} characters need ${expectedPadding || "none"}.`);
  }
  if (padding === 0 && expectedPadding > 0) {
    warnings.push("The base64 is missing its = padding. Many servers accept that, but strict ones reject the header.");
  }

  const binary = atob(data + "=".repeat(expectedPadding));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));

  let decoded: string;
  let charset: BasicAuthDecoded["charset"] = "UTF-8";
  try {
    decoded = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    // Before RFC 7617 most clients sent ISO-8859-1, where every byte is a character.
    decoded = binary;
    charset = "ISO-8859-1";
    warnings.push("The credentials are not valid UTF-8, so they were read as ISO-8859-1, the charset older clients used.");
  }

  const colon = decoded.indexOf(":");
  if (colon === -1) {
    return err(
      `The credentials decode to ${JSON.stringify(decoded)}, which has no colon. Basic auth encodes username:password, so this is not a Basic auth value (or the colon was left out when it was built).`,
    );
  }

  const username = decoded.slice(0, colon);
  const password = decoded.slice(colon + 1);
  if (!username) warnings.push("The username is empty.");
  if (!password) warnings.push("The password is empty.");
  if (CONTROL.test(decoded)) warnings.push("The credentials contain control characters, which RFC 7617 does not allow.");

  return ok({ username, password, headerName, charset, warnings });
}
