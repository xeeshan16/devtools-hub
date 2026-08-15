/**
 * Every tool module returns this shape instead of throwing, so the UI layer
 * renders errors as inline validation rather than crashing a client boundary.
 */
export type ToolResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function ok<T>(value: T): ToolResult<T> {
  return { ok: true, value };
}

export function err<T = never>(error: string): ToolResult<T> {
  return { ok: false, error };
}

/** Normalizes an unknown thrown value into a readable message. */
export function messageOf(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string" && e) return e;
  return fallback;
}
