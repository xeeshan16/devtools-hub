import { err, ok, type ToolResult } from "./result";

export type UuidVersion = "v4" | "v7" | "nil";

const HEX = "0123456789abcdef";

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function format(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < 16; i++) {
    if (i === 4 || i === 6 || i === 8 || i === 10) out += "-";
    out += HEX[bytes[i] >> 4] + HEX[bytes[i] & 0x0f];
  }
  return out;
}

export function uuidV4(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  return format(bytes);
}

/**
 * UUIDv7 (RFC 9562): 48-bit big-endian Unix timestamp in ms, then random.
 * Sorts lexicographically by creation time, which is why it is preferred over
 * v4 for database primary keys.
 */
export function uuidV7(now: number = Date.now()): string {
  const bytes = randomBytes(16);
  const ms = BigInt(now);

  for (let i = 0; i < 6; i++) {
    bytes[i] = Number((ms >> BigInt(8 * (5 - i))) & 0xffn);
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return format(bytes);
}

export const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export function generateUuids(
  version: UuidVersion,
  count: number,
): ToolResult<string[]> {
  if (!Number.isInteger(count) || count < 1) {
    return err("Count must be a whole number of at least 1.");
  }
  if (count > 1000) {
    return err("Count is capped at 1000 per batch.");
  }

  const make =
    version === "v4" ? uuidV4 : version === "v7" ? () => uuidV7() : () => NIL_UUID;

  return ok(Array.from({ length: count }, make));
}

export type UuidInfo = {
  version: number | "nil";
  variant: string;
  timestamp?: Date;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function inspectUuid(input: string): ToolResult<UuidInfo> {
  const value = input.trim().toLowerCase();
  if (!value) return err("Enter a UUID to inspect.");
  if (!UUID_PATTERN.test(value)) {
    return err("Not a valid UUID — expected 8-4-4-4-12 hexadecimal characters.");
  }
  if (value === NIL_UUID) {
    return ok({ version: "nil", variant: "special (nil UUID)" });
  }

  const hex = value.replace(/-/g, "");
  const version = parseInt(hex[12], 16);
  const variantNibble = parseInt(hex[16], 16);

  const variant =
    variantNibble >> 3 === 0
      ? "NCS (reserved, legacy)"
      : variantNibble >> 2 === 0b10
        ? "RFC 9562"
        : variantNibble >> 1 === 0b110
          ? "Microsoft (reserved)"
          : "future (reserved)";

  const info: UuidInfo = { version, variant };

  if (version === 7) {
    info.timestamp = new Date(Number(BigInt("0x" + hex.slice(0, 12))));
  }

  return ok(info);
}
