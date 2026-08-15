import { err, ok, type ToolResult } from "./result";

/**
 * `btoa`/`atob` operate on latin1, so they throw on any character above U+00FF.
 * Round-tripping through TextEncoder/TextDecoder makes the tool UTF-8 safe,
 * which matters because most real payloads users paste in are UTF-8 JSON.
 */
function bytesToBinaryString(bytes: Uint8Array): string {
  let out = "";
  // Chunked to stay under the argument-count limit on large inputs.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return out;
}

export function encodeBase64(input: string, urlSafe = false): ToolResult<string> {
  if (!input) return ok("");

  const encoded = btoa(bytesToBinaryString(new TextEncoder().encode(input)));
  return ok(urlSafe ? toUrlSafe(encoded) : encoded);
}

export function decodeBase64(input: string, urlSafe = false): ToolResult<string> {
  const trimmed = input.trim();
  if (!trimmed) return ok("");

  const normalized = urlSafe ? fromUrlSafe(trimmed) : trimmed;

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    return err("Input contains characters that are not valid Base64.");
  }

  let binary: string;
  try {
    binary = atob(normalized);
  } catch {
    return err("Invalid Base64 — the input length or padding is malformed.");
  }

  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));

  try {
    // `fatal` surfaces invalid byte sequences instead of silently emitting U+FFFD.
    return ok(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return err("Decoded successfully, but the bytes are not valid UTF-8 text.");
  }
}

export function toUrlSafe(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromUrlSafe(input: string): string {
  const restored = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = restored.length % 4;
  return padding ? restored + "=".repeat(4 - padding) : restored;
}
