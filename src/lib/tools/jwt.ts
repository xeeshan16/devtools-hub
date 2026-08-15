import { decodeBase64 } from "./base64";
import { err, ok, type ToolResult } from "./result";

export type JwtClaimNote = {
  claim: string;
  label: string;
  detail: string;
  status: "ok" | "warn" | "error" | "info";
};

export type DecodedJwt = {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  headerJson: string;
  payloadJson: string;
  notes: JwtClaimNote[];
  expired: boolean | null;
};

function decodeSegment(
  segment: string,
  name: string,
): ToolResult<Record<string, unknown>> {
  const decoded = decodeBase64(segment, true);
  if (!decoded.ok) return err(`Could not Base64URL-decode the ${name}.`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded.value);
  } catch {
    return err(`The ${name} decoded, but it is not valid JSON.`);
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return err(`The ${name} must be a JSON object.`);
  }

  return ok(parsed as Record<string, unknown>);
}

function timeClaim(
  payload: Record<string, unknown>,
  claim: "exp" | "nbf" | "iat",
  now: Date,
): JwtClaimNote | null {
  const raw = payload[claim];
  if (typeof raw !== "number") return null;

  const date = new Date(raw * 1000);
  const readable = date.toUTCString();
  const past = date.getTime() <= now.getTime();

  if (claim === "exp") {
    return {
      claim,
      label: "Expires",
      detail: readable,
      status: past ? "error" : "ok",
    };
  }
  if (claim === "nbf") {
    return {
      claim,
      label: "Not valid before",
      detail: readable,
      status: past ? "ok" : "warn",
    };
  }
  return { claim, label: "Issued at", detail: readable, status: "info" };
}

export function decodeJwt(input: string, now: Date = new Date()): ToolResult<DecodedJwt> {
  const token = input.trim().replace(/^Bearer\s+/i, "");
  if (!token) return err("Paste a JWT to decode.");

  const parts = token.split(".");
  if (parts.length !== 3) {
    return err(
      `A JWT has three dot-separated parts; this input has ${parts.length}.`,
    );
  }

  const header = decodeSegment(parts[0], "header");
  if (!header.ok) return err(header.error);

  const payload = decodeSegment(parts[1], "payload");
  if (!payload.ok) return err(payload.error);

  const notes: JwtClaimNote[] = [];

  const alg = header.value.alg;
  if (typeof alg === "string") {
    notes.push({
      claim: "alg",
      label: "Algorithm",
      detail: alg,
      status: alg.toLowerCase() === "none" ? "error" : "info",
    });
  }

  for (const claim of ["iat", "nbf", "exp"] as const) {
    const note = timeClaim(payload.value, claim, now);
    if (note) notes.push(note);
  }

  for (const [claim, label] of [
    ["iss", "Issuer"],
    ["sub", "Subject"],
    ["aud", "Audience"],
  ] as const) {
    const raw = payload.value[claim];
    if (raw !== undefined) {
      notes.push({
        claim,
        label,
        detail: Array.isArray(raw) ? raw.join(", ") : String(raw),
        status: "info",
      });
    }
  }

  const exp = payload.value.exp;
  const expired = typeof exp === "number" ? exp * 1000 <= now.getTime() : null;

  return ok({
    header: header.value,
    payload: payload.value,
    signature: parts[2],
    headerJson: JSON.stringify(header.value, null, 2),
    payloadJson: JSON.stringify(payload.value, null, 2),
    notes,
    expired,
  });
}
