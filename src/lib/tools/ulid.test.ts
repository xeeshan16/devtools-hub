import { describe, expect, it } from "vitest";
import { MAX_ULID_TIME, generateUlids, inspectUlid } from "./ulid";

const ULID_SHAPE = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

const zeros = (length: number) => new Uint8Array(length);
const ones = (length: number) => new Uint8Array(length).fill(0xff);

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

describe("generateUlids", () => {
  it("produces 26 Crockford Base32 characters", () => {
    const [ulid] = unwrap(generateUlids(1));
    expect(ulid).toMatch(ULID_SHAPE);
  });

  it("encodes the timestamp in the first ten characters", () => {
    // Example from the ULID spec: 1469918176385 ms → 01ARYZ6S41.
    const [ulid] = unwrap(generateUlids(1, { now: 1469918176385, random: zeros }));
    expect(ulid).toBe("01ARYZ6S41" + "0".repeat(16));
  });

  it("encodes the extremes of the time and random range", () => {
    expect(unwrap(generateUlids(1, { now: 0, random: zeros }))).toEqual(["0".repeat(26)]);
    expect(unwrap(generateUlids(1, { now: MAX_ULID_TIME, random: ones }))).toEqual([
      "7" + "Z".repeat(25),
    ]);
  });

  it("sorts lexicographically by creation time", () => {
    const [early] = unwrap(generateUlids(1, { now: 1_000_000_000_000 }));
    const [late] = unwrap(generateUlids(1, { now: 2_000_000_000_000 }));
    expect([late, early].sort()).toEqual([early, late]);
  });

  it("draws fresh randomness for each ULID by default", () => {
    const ulids = unwrap(generateUlids(500, { now: 1_700_000_000_000 }));
    expect(new Set(ulids).size).toBe(500);
  });

  it("increments the random part in monotonic mode, preserving order", () => {
    const ulids = unwrap(
      generateUlids(3, { now: 1_700_000_000_000, monotonic: true, random: zeros }),
    );
    expect(ulids.map((u) => u.slice(10))).toEqual([
      "0000000000000000",
      "0000000000000001",
      "0000000000000002",
    ]);
    expect([...ulids].sort()).toEqual(ulids);
  });

  it("carries across characters when incrementing", () => {
    const random = (length: number) => {
      const bytes = zeros(length);
      bytes[length - 1] = 31; // last Base32 digit is Z
      return bytes;
    };
    const ulids = unwrap(generateUlids(2, { now: 0, monotonic: true, random }));
    expect(ulids[0].slice(-2)).toBe("0Z");
    expect(ulids[1].slice(-2)).toBe("10");
  });

  it("reports overflow of the random part instead of wrapping", () => {
    const result = generateUlids(2, { now: 0, monotonic: true, random: ones });
    expect(result.ok).toBe(false);
  });

  it("rejects bad counts and timestamps", () => {
    expect(generateUlids(0).ok).toBe(false);
    expect(generateUlids(1.5).ok).toBe(false);
    expect(generateUlids(1001).ok).toBe(false);
    expect(generateUlids(1000).ok).toBe(true);
    expect(generateUlids(1, { now: -1 }).ok).toBe(false);
    expect(generateUlids(1, { now: MAX_ULID_TIME + 1 }).ok).toBe(false);
  });
});

describe("inspectUlid", () => {
  it("decodes the timestamp, random part and UUID form", () => {
    const info = unwrap(inspectUlid("01ARYZ6S41" + "0".repeat(15) + "1"));
    expect(info.timestamp.getTime()).toBe(1469918176385);
    expect(info.randomHex).toBe("00000000000000000001");
    expect(info.uuid).toBe("01563df3-6481-0000-0000-000000000001");
  });

  it("round-trips a generated ULID", () => {
    const now = Date.UTC(2026, 0, 2, 3, 4, 5, 678);
    const [ulid] = unwrap(generateUlids(1, { now }));
    const info = unwrap(inspectUlid(ulid));
    expect(info.ulid).toBe(ulid);
    expect(info.timestamp.getTime()).toBe(now);
  });

  it("accepts lower case and surrounding whitespace", () => {
    const info = unwrap(inspectUlid("  01aryz6s41tsv4rrffq69g5fav \n"));
    expect(info.ulid).toBe("01ARYZ6S41TSV4RRFFQ69G5FAV");
  });

  it("formats the maximum ULID as the maximum UUID", () => {
    const info = unwrap(inspectUlid("7" + "Z".repeat(25)));
    expect(info.uuid).toBe("ffffffff-ffff-ffff-ffff-ffffffffffff");
    expect(info.timestamp.getTime()).toBe(MAX_ULID_TIME);
  });

  it("explains what is wrong with invalid input", () => {
    const empty = inspectUlid("   ");
    expect(empty.ok).toBe(false);

    const short = inspectUlid("01ARYZ6S41");
    expect(short.ok || short.error).toContain("26 characters");

    const badChar = inspectUlid("01ARYZ6S41TSV4RRFFQ69G5FAU");
    expect(badChar.ok || badChar.error).toContain('"U"');

    const overflow = inspectUlid("8" + "0".repeat(25));
    expect(overflow.ok || overflow.error).toContain("at most 7");
  });
});
