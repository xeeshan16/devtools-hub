import { describe, expect, it } from "vitest";
import type { ToolResult } from "./result";
import {
  TOTAL_UNITS,
  describeDuration,
  formatComponents,
  formatIsoDuration,
  formatQuotient,
  parseDuration,
  type ParsedDuration,
} from "./iso-duration";

function value<T>(result: ToolResult<T>): T {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.value;
}

function error<T>(result: ToolResult<T>): string {
  if (result.ok) throw new Error("expected an error");
  return result.error;
}

function parse(text: string): ParsedDuration {
  const parsed = value(parseDuration(text));
  if (!parsed) throw new Error("expected a duration");
  return parsed;
}

const SECOND = 1_000_000_000n;
const total = (text: string) => parse(text).totalNanos;
const unit = (key: (typeof TOTAL_UNITS)[number]["key"]) => TOTAL_UNITS.find((u) => u.key === key)!.nanos;

describe("parseDuration", () => {
  it("treats empty input as no duration", () => {
    expect(value(parseDuration(""))).toBeNull();
    expect(value(parseDuration("   "))).toBeNull();
  });

  it("parses every component", () => {
    const parsed = parse("P1Y2M3W4DT5H6M7S");
    expect(parsed.components).toEqual({
      years: "1",
      months: "2",
      weeks: "3",
      days: "4",
      hours: "5",
      minutes: "6",
      seconds: "7",
    });
    expect(parsed.negative).toBe(false);
    expect(parsed.fromSeconds).toBe(false);
  });

  it("tells months from minutes by the T separator", () => {
    expect(parse("P1M").components).toEqual({ months: "1" });
    expect(parse("PT1M").components).toEqual({ minutes: "1" });
  });

  it("computes exact totals for fixed-length durations", () => {
    expect(total("PT1H30M")).toBe(5_400n * SECOND);
    expect(total("P1DT2H")).toBe(93_600n * SECOND);
    expect(total("P2W")).toBe(1_209_600n * SECOND);
    expect(total("PT0S")).toBe(0n);
  });

  it("has no total when years or months are present", () => {
    expect(total("P1Y")).toBeNull();
    expect(total("P1MT1S")).toBeNull();
  });

  it("converts fractions exactly", () => {
    expect(total("PT0.1S")).toBe(100_000_000n);
    expect(total("PT1.5H")).toBe(5_400n * SECOND);
    expect(total("PT0.000000001S")).toBe(1n);
    expect(total("P0.5D")).toBe(43_200n * SECOND);
  });

  it("accepts a comma as the decimal sign and normalizes it", () => {
    expect(parse("PT1,5S").components).toEqual({ seconds: "1.5" });
  });

  it("is lenient about case and a leading sign", () => {
    expect(total("pt2h")).toBe(7_200n * SECOND);
    expect(parse("-PT5M")).toMatchObject({ negative: true, totalNanos: -300n * SECOND });
    expect(parse("+PT5M").negative).toBe(false);
    expect(parse("-PT0S").negative).toBe(false);
  });

  it("reads a plain number as seconds", () => {
    expect(parse("90")).toMatchObject({ fromSeconds: true, totalNanos: 90n * SECOND });
    expect(parse("1.25").totalNanos).toBe(1_250_000_000n);
    expect(parse("-3600").negative).toBe(true);
  });

  it("rejects malformed durations with a reason", () => {
    expect(error(parseDuration("1H"))).toMatch(/starts with "P"/);
    expect(error(parseDuration("P"))).toMatch(/at least one component/);
    expect(error(parseDuration("PT"))).toMatch(/"T" must be followed/);
    expect(error(parseDuration("P1H"))).toMatch(/order/);
    expect(error(parseDuration("PT1S2M"))).toMatch(/order/);
    expect(error(parseDuration("P1.5DT2H"))).toMatch(/Only the last component/);
    expect(error(parseDuration("PT0.1234567891S"))).toMatch(/at most 9/);
    expect(error(parseDuration("0.1234567891"))).toMatch(/at most 9/);
  });
});

describe("formatIsoDuration", () => {
  it("normalizes overflowing units", () => {
    expect(formatIsoDuration(total("PT90M")!)).toBe("PT1H30M");
    expect(formatIsoDuration(total("PT86400S")!)).toBe("P1D");
    expect(formatIsoDuration(total("P1W")!)).toBe("P7D");
  });

  it("keeps hours unbounded when days are not wanted", () => {
    expect(formatIsoDuration(total("P1DT2H")!, false)).toBe("PT26H");
  });

  it("writes fractional seconds and signs", () => {
    expect(formatIsoDuration(total("PT0.5S")!)).toBe("PT0.5S");
    expect(formatIsoDuration(total("-PT61.25S")!)).toBe("-PT1M1.25S");
    expect(formatIsoDuration(0n)).toBe("PT0S");
  });
});

describe("formatComponents", () => {
  it("writes components in canonical form", () => {
    const parsed = parse("p1y0002mt1,50s");
    expect(formatComponents(parsed.negative, parsed.components)).toBe("P1Y2MT1.5S");
  });
});

describe("formatQuotient", () => {
  it("returns exact values without a marker", () => {
    expect(formatQuotient(total("PT1H30M")!, unit("hours"))).toEqual({ text: "1.5", exact: true });
    expect(formatQuotient(total("P2W")!, unit("seconds"))).toEqual({ text: "1,209,600", exact: true });
  });

  it("rounds repeating decimals and flags them", () => {
    expect(formatQuotient(total("PT20M")!, unit("hours"))).toEqual({ text: "0.333333", exact: false });
    expect(formatQuotient(total("PT40M")!, unit("hours"))).toEqual({ text: "0.666667", exact: false });
  });

  it("keeps the sign", () => {
    expect(formatQuotient(total("-PT90S")!, unit("minutes")).text).toBe("-1.5");
  });
});

describe("describeDuration", () => {
  it("describes ISO components as written", () => {
    expect(describeDuration(parse("P1DT2H30M"))).toBe("1 day, 2 hours, 30 minutes");
    expect(describeDuration(parse("P1Y1M"))).toBe("1 year, 1 month");
    expect(describeDuration(parse("PT0H1M"))).toBe("1 minute");
  });

  it("breaks plain seconds into larger units", () => {
    expect(describeDuration(parse("93784.5"))).toBe("1 day, 2 hours, 3 minutes, 4.5 seconds");
  });

  it("handles zero and negative durations", () => {
    expect(describeDuration(parse("PT0S"))).toBe("zero");
    expect(describeDuration(parse("-PT1S"))).toBe("minus 1 second");
  });
});
