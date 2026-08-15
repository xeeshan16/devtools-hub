import { describe, expect, it } from "vitest";
import {
  NIL_UUID,
  generateUuids,
  inspectUuid,
  uuidV4,
  uuidV7,
} from "./uuid";

const UUID_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("uuidV4", () => {
  it("has the right shape, version and variant bits", () => {
    const uuid = uuidV4();
    expect(uuid).toMatch(UUID_SHAPE);
    expect(uuid[14]).toBe("4");
    expect("89ab").toContain(uuid[19]);
  });

  it("does not repeat", () => {
    const generated = new Set(Array.from({ length: 500 }, uuidV4));
    expect(generated.size).toBe(500);
  });
});

describe("uuidV7", () => {
  it("encodes the supplied timestamp in its first 48 bits", () => {
    const now = Date.UTC(2024, 5, 1, 12, 0, 0);
    const uuid = uuidV7(now);
    expect(uuid[14]).toBe("7");
    expect(parseInt(uuid.replace(/-/g, "").slice(0, 12), 16)).toBe(now);
  });

  it("sorts lexicographically by creation time", () => {
    const early = uuidV7(1_000_000_000_000);
    const late = uuidV7(2_000_000_000_000);
    expect([late, early].sort()).toEqual([early, late]);
  });
});

describe("generateUuids", () => {
  it("generates the requested count", () => {
    const result = generateUuids("v4", 10);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toHaveLength(10);
  });

  it("returns identical nil UUIDs for the nil version", () => {
    const result = generateUuids("nil", 3);
    if (!result.ok) throw new Error(result.error);
    expect(result.value).toEqual([NIL_UUID, NIL_UUID, NIL_UUID]);
  });

  it("rejects counts below one and above the batch cap", () => {
    expect(generateUuids("v4", 0).ok).toBe(false);
    expect(generateUuids("v4", 1.5).ok).toBe(false);
    expect(generateUuids("v4", 1001).ok).toBe(false);
    expect(generateUuids("v4", 1000).ok).toBe(true);
  });
});

describe("inspectUuid", () => {
  it("reads the version and variant", () => {
    const result = inspectUuid("f81d4fae-7dec-41d0-a765-00a0c91e6bf6");
    if (!result.ok) throw new Error(result.error);
    expect(result.value.version).toBe(4);
    expect(result.value.variant).toBe("RFC 9562");
  });

  it("recovers the embedded timestamp from a v7 UUID", () => {
    const now = Date.UTC(2024, 5, 1, 12, 0, 0);
    const result = inspectUuid(uuidV7(now));
    if (!result.ok) throw new Error(result.error);
    expect(result.value.timestamp?.getTime()).toBe(now);
  });

  it("recognises the nil UUID as a special case", () => {
    const result = inspectUuid(NIL_UUID);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.version).toBe("nil");
  });

  it("accepts uppercase input", () => {
    expect(inspectUuid("F81D4FAE-7DEC-41D0-A765-00A0C91E6BF6").ok).toBe(true);
  });

  it("rejects malformed input", () => {
    expect(inspectUuid("").ok).toBe(false);
    expect(inspectUuid("not-a-uuid").ok).toBe(false);
    expect(inspectUuid("f81d4fae7dec41d0a76500a0c91e6bf6").ok).toBe(false);
  });
});
