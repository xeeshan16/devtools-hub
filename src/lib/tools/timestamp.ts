import { err, ok, type ToolResult } from "./result";

export type TimestampUnit = "seconds" | "milliseconds";

export type TimestampBreakdown = {
  date: Date;
  unix: number;
  unixMs: number;
  iso: string;
  utc: string;
  local: string;
  localZone: string;
  relative: string;
  dayOfWeek: string;
};

/**
 * Distinguishing seconds from milliseconds by magnitude: any plausible modern
 * second-precision stamp is < 1e11 (year 5138), while a ms stamp for any date
 * after 1973 is >= 1e11. Ambiguity only exists for dates near the epoch.
 */
export function guessUnit(value: number): TimestampUnit {
  return Math.abs(value) >= 1e11 ? "milliseconds" : "seconds";
}

export function relativeTime(from: Date, now: Date = new Date()): string {
  const deltaMs = from.getTime() - now.getTime();
  const abs = Math.abs(deltaMs);

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000_000],
    ["month", 2_592_000_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
    ["second", 1000],
  ];

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  for (const [unit, ms] of units) {
    if (abs >= ms) {
      return formatter.format(Math.round(deltaMs / ms), unit);
    }
  }
  return "just now";
}

function describe(date: Date, now?: Date): TimestampBreakdown {
  const unixMs = date.getTime();
  return {
    date,
    unix: Math.floor(unixMs / 1000),
    unixMs,
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toLocaleString(undefined, {
      dateStyle: "full",
      timeStyle: "long",
    }),
    localZone:
      Intl.DateTimeFormat().resolvedOptions().timeZone ?? "local time zone",
    relative: relativeTime(date, now),
    dayOfWeek: date.toLocaleDateString(undefined, { weekday: "long" }),
  };
}

export function fromUnix(
  input: string,
  unit: TimestampUnit | "auto" = "auto",
  now?: Date,
): ToolResult<TimestampBreakdown> {
  const trimmed = input.trim();
  if (!trimmed) return err("Enter a Unix timestamp.");

  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return err("A Unix timestamp must be a number.");
  }

  const value = Number(trimmed);
  const resolved = unit === "auto" ? guessUnit(value) : unit;
  const ms = resolved === "seconds" ? value * 1000 : value;

  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) {
    return err("That number is outside the representable date range.");
  }

  return ok(describe(date, now));
}

export function fromDateString(
  input: string,
  now?: Date,
): ToolResult<TimestampBreakdown> {
  const trimmed = input.trim();
  if (!trimmed) return err("Enter a date to convert.");

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return err(
      "Could not parse that date. Try an ISO 8601 value like 2024-03-01T12:00:00Z.",
    );
  }

  return ok(describe(date, now));
}

export function nowBreakdown(now: Date = new Date()): TimestampBreakdown {
  return describe(now, now);
}
