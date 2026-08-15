import { describe, expect, it } from "vitest";
import {
  fromDateString,
  fromUnix,
  guessUnit,
  relativeTime,
} from "./timestamp";

const JUNE_1_2024 = "2024-06-01T12:00:00.000Z";
const JUNE_1_2024_S = 1717243200;

describe("guessUnit", () => {
  it("treats present-day 10-digit values as seconds", () => {
    expect(guessUnit(JUNE_1_2024_S)).toBe("seconds");
  });

  it("treats 13-digit values as milliseconds", () => {
    expect(guessUnit(JUNE_1_2024_S * 1000)).toBe("milliseconds");
  });

  it("uses magnitude, not sign, so negative stamps behave the same", () => {
    expect(guessUnit(-86_400)).toBe("seconds");
    expect(guessUnit(-1e12)).toBe("milliseconds");
  });
});

describe("fromUnix", () => {
  it("converts seconds", () => {
    const result = fromUnix(String(JUNE_1_2024_S));
    if (!result.ok) throw new Error(result.error);
    expect(result.value.iso).toBe(JUNE_1_2024);
    expect(result.value.unix).toBe(JUNE_1_2024_S);
    expect(result.value.unixMs).toBe(JUNE_1_2024_S * 1000);
  });

  it("converts milliseconds", () => {
    const result = fromUnix(String(JUNE_1_2024_S * 1000));
    if (!result.ok) throw new Error(result.error);
    expect(result.value.iso).toBe(JUNE_1_2024);
  });

  it("honours an explicit unit over the automatic guess", () => {
    // Read as milliseconds, the same number lands 19 days after the epoch.
    const result = fromUnix(String(JUNE_1_2024_S), "milliseconds");
    if (!result.ok) throw new Error(result.error);
    expect(result.value.unixMs).toBe(JUNE_1_2024_S);
    expect(result.value.iso).toBe(new Date(JUNE_1_2024_S).toISOString());
  });

  it("handles pre-epoch negative values", () => {
    const result = fromUnix("-86400");
    if (!result.ok) throw new Error(result.error);
    expect(result.value.iso).toBe("1969-12-31T00:00:00.000Z");
  });

  it("rejects blank and non-numeric input", () => {
    expect(fromUnix("").ok).toBe(false);
    expect(fromUnix("not a number").ok).toBe(false);
    expect(fromUnix("2024-06-01").ok).toBe(false);
  });

  it("rejects values outside the representable date range", () => {
    expect(fromUnix("99999999999999999", "milliseconds").ok).toBe(false);
  });
});

describe("fromDateString", () => {
  it("parses ISO 8601 with a UTC marker", () => {
    const result = fromDateString(JUNE_1_2024);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.unix).toBe(JUNE_1_2024_S);
  });

  it("normalises a non-UTC offset", () => {
    const result = fromDateString("2024-06-01T14:00:00+02:00");
    if (!result.ok) throw new Error(result.error);
    expect(result.value.unix).toBe(JUNE_1_2024_S);
  });

  it("rejects unparseable input", () => {
    expect(fromDateString("").ok).toBe(false);
    expect(fromDateString("last tuesday").ok).toBe(false);
  });
});

describe("relativeTime", () => {
  const now = new Date(JUNE_1_2024);

  it("describes the past and the future", () => {
    expect(relativeTime(new Date(now.getTime() - 3 * 3_600_000), now)).toBe(
      "3 hours ago",
    );
    expect(relativeTime(new Date(now.getTime() + 2 * 86_400_000), now)).toBe(
      "in 2 days",
    );
  });

  it("collapses sub-second differences", () => {
    expect(relativeTime(new Date(now.getTime() + 10), now)).toBe("just now");
  });
});
