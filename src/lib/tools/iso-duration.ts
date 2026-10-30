import { err, ok, type ToolResult } from "./result";

/**
 * ISO 8601 durations (`P1DT2H30M`, `PT0.5S`, `P2W`) parsed into their
 * components, plus exact totals when the duration has a fixed length.
 *
 * Years and months have no fixed number of seconds (a month is 28 to 31 days),
 * so a duration that uses them gets components but no totals. Days are taken
 * as 24 hours, the convention used by Java's Duration, .NET's XmlConvert and
 * most libraries; a calendar day across a DST change can be 23 or 25 hours.
 *
 * Totals are kept in nanoseconds as a BigInt so fractional components such as
 * `PT0.1S` or `PT1.5H` convert without floating-point drift.
 */

export const DURATION_FIELDS = [
  { key: "years", designator: "Y", singular: "year", plural: "years", time: false },
  { key: "months", designator: "M", singular: "month", plural: "months", time: false },
  { key: "weeks", designator: "W", singular: "week", plural: "weeks", time: false },
  { key: "days", designator: "D", singular: "day", plural: "days", time: false },
  { key: "hours", designator: "H", singular: "hour", plural: "hours", time: true },
  { key: "minutes", designator: "M", singular: "minute", plural: "minutes", time: true },
  { key: "seconds", designator: "S", singular: "second", plural: "seconds", time: true },
] as const;

export type DurationField = (typeof DURATION_FIELDS)[number]["key"];

/** Each present component, as the decimal text it was written with (`"1.5"`). */
export type DurationComponents = Partial<Record<DurationField, string>>;

export type ParsedDuration = {
  negative: boolean;
  components: DurationComponents;
  /** Exact signed length in nanoseconds, or null when years or months are present. */
  totalNanos: bigint | null;
  /** True when the input was a plain number of seconds rather than ISO text. */
  fromSeconds: boolean;
};

const MAX_FRACTION_DIGITS = 9;
const NANOS_PER_SECOND = 1_000_000_000n;

const NANOS_PER_UNIT: Record<Exclude<DurationField, "years" | "months">, bigint> = {
  weeks: 7n * 86_400n * NANOS_PER_SECOND,
  days: 86_400n * NANOS_PER_SECOND,
  hours: 3_600n * NANOS_PER_SECOND,
  minutes: 60n * NANOS_PER_SECOND,
  seconds: NANOS_PER_SECOND,
};

const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`;
const ISO_PATTERN = new RegExp(
  String.raw`^([+-])?P(?:${NUMBER}Y)?(?:${NUMBER}M)?(?:${NUMBER}W)?(?:${NUMBER}D)?` +
    String.raw`(T(?:${NUMBER}H)?(?:${NUMBER}M)?(?:${NUMBER}S)?)?$`,
  "i",
);
const SECONDS_PATTERN = /^([+-])?(\d+(?:\.\d+)?)$/;

/** Splits "12.5" into an integer mantissa and its number of decimal places. */
function decimalParts(text: string): { mantissa: bigint; scale: number } {
  const [whole, fraction = ""] = text.split(".");
  return { mantissa: BigInt(whole + fraction), scale: fraction.length };
}

function toNanos(text: string, nanosPerUnit: bigint): bigint {
  const { mantissa, scale } = decimalParts(text);
  // With at most nine fraction digits, every unit (a multiple of 1e9 ns)
  // divides evenly, so this division is always exact.
  return (mantissa * nanosPerUnit) / 10n ** BigInt(scale);
}

function normalizeNumber(text: string): string {
  const [whole, fraction] = text.replace(",", ".").split(".");
  const trimmedWhole = whole.replace(/^0+(?=\d)/, "");
  const trimmedFraction = (fraction ?? "").replace(/0+$/, "");
  return trimmedFraction ? `${trimmedWhole}.${trimmedFraction}` : trimmedWhole;
}

/**
 * Parses an ISO 8601 duration or a plain number of seconds. Empty input
 * returns `ok(null)` so the UI can show a blank state rather than an error.
 */
export function parseDuration(input: string): ToolResult<ParsedDuration | null> {
  const text = input.trim();
  if (!text) return ok(null);

  const seconds = SECONDS_PATTERN.exec(text);
  if (seconds) {
    const value = normalizeNumber(seconds[2]);
    if ((value.split(".")[1] ?? "").length > MAX_FRACTION_DIGITS) {
      return err(`Seconds can have at most ${MAX_FRACTION_DIGITS} decimal places (nanosecond precision).`);
    }
    const nanos = toNanos(value, NANOS_PER_SECOND);
    const negative = seconds[1] === "-" && nanos !== 0n;
    return ok({
      negative,
      components: { seconds: value },
      totalNanos: negative ? -nanos : nanos,
      fromSeconds: true,
    });
  }

  if (!/^[+-]?P/i.test(text)) {
    return err('An ISO 8601 duration starts with "P", for example P1DT2H30M or PT45S. You can also enter a plain number of seconds.');
  }

  const match = ISO_PATTERN.exec(text.replace(/\s+/g, ""));
  if (!match) {
    return err(
      "Not a valid ISO 8601 duration. Components must appear in the order Y, M, W, D, then T followed by H, M, S, each preceded by a number: P1Y2M3DT4H5M6S.",
    );
  }

  const [, sign, years, months, weeks, days, timePart, hours, minutes, secs] = match;
  const raw: Record<DurationField, string | undefined> = { years, months, weeks, days, hours, minutes, seconds: secs };

  if (timePart !== undefined && hours === undefined && minutes === undefined && secs === undefined) {
    return err('"T" must be followed by at least one of H, M or S, for example PT30M.');
  }

  const present = DURATION_FIELDS.filter((f) => raw[f.key] !== undefined);
  if (present.length === 0) {
    return err('A duration needs at least one component after "P", for example P1D or PT0S.');
  }

  const components: DurationComponents = {};
  for (const [i, field] of present.entries()) {
    const value = normalizeNumber(raw[field.key]!);
    const fraction = value.split(".")[1];
    if (fraction && i !== present.length - 1) {
      return err(`Only the last component may have a decimal fraction; ${field.plural} is followed by smaller units.`);
    }
    if (fraction && fraction.length > MAX_FRACTION_DIGITS) {
      return err(`A fraction can have at most ${MAX_FRACTION_DIGITS} decimal places.`);
    }
    components[field.key] = value;
  }

  let totalNanos: bigint | null = null;
  if (components.years === undefined && components.months === undefined) {
    totalNanos = 0n;
    for (const key of ["weeks", "days", "hours", "minutes", "seconds"] as const) {
      const value = components[key];
      if (value !== undefined) totalNanos += toNanos(value, NANOS_PER_UNIT[key]);
    }
  }

  const negative = sign === "-" && totalNanos !== 0n;
  return ok({
    negative,
    components,
    totalNanos: negative && totalNanos !== null ? -totalNanos : totalNanos,
    fromSeconds: false,
  });
}

/** Formats `nanos / divisor` as a decimal, rounded to `maxDecimals` places. */
export function formatQuotient(
  nanos: bigint,
  divisor: bigint,
  maxDecimals = 6,
): { text: string; exact: boolean } {
  const negative = nanos < 0n;
  const abs = negative ? -nanos : nanos;
  const scale = 10n ** BigInt(maxDecimals);
  const scaled = abs * scale;
  let units = scaled / divisor;
  const remainder = scaled % divisor;
  if (remainder * 2n >= divisor) units += 1n;

  const whole = units / scale;
  const fraction = (units % scale).toString().padStart(maxDecimals, "0").replace(/0+$/, "");
  const body = `${whole.toLocaleString("en-US")}${fraction ? `.${fraction}` : ""}`;
  return { text: `${negative && units !== 0n ? "-" : ""}${body}`, exact: remainder === 0n };
}

export const TOTAL_UNITS = [
  { key: "milliseconds", label: "Milliseconds", nanos: 1_000_000n },
  { key: "seconds", label: "Seconds", nanos: NANOS_PER_SECOND },
  { key: "minutes", label: "Minutes", nanos: 60n * NANOS_PER_SECOND },
  { key: "hours", label: "Hours", nanos: 3_600n * NANOS_PER_SECOND },
  { key: "days", label: "Days (24 h)", nanos: 86_400n * NANOS_PER_SECOND },
  { key: "weeks", label: "Weeks", nanos: 7n * 86_400n * NANOS_PER_SECOND },
] as const;

type Breakdown = { days: bigint; hours: bigint; minutes: bigint; seconds: bigint; nanos: bigint };

function breakdown(totalNanos: bigint, withDays: boolean): Breakdown {
  let rest = totalNanos < 0n ? -totalNanos : totalNanos;
  const days = withDays ? rest / NANOS_PER_UNIT.days : 0n;
  rest -= days * NANOS_PER_UNIT.days;
  const hours = rest / NANOS_PER_UNIT.hours;
  rest -= hours * NANOS_PER_UNIT.hours;
  const minutes = rest / NANOS_PER_UNIT.minutes;
  rest -= minutes * NANOS_PER_UNIT.minutes;
  const seconds = rest / NANOS_PER_SECOND;
  return { days, hours, minutes, seconds, nanos: rest - seconds * NANOS_PER_SECOND };
}

function secondsText(seconds: bigint, nanos: bigint): string {
  const fraction = nanos.toString().padStart(9, "0").replace(/0+$/, "");
  return fraction ? `${seconds}.${fraction}` : `${seconds}`;
}

/**
 * Builds an ISO 8601 duration from an exact length. With `withDays`, whole
 * days become a D component (`P1DT2H`); without, hours are left unbounded
 * (`PT26H`), which is what Java's `Duration.toString()` produces.
 */
export function formatIsoDuration(totalNanos: bigint, withDays = true): string {
  const sign = totalNanos < 0n ? "-" : "";
  const b = breakdown(totalNanos, withDays);
  const date = b.days > 0n ? `${b.days}D` : "";
  let time = "";
  if (b.hours > 0n) time += `${b.hours}H`;
  if (b.minutes > 0n) time += `${b.minutes}M`;
  if (b.seconds > 0n || b.nanos > 0n) time += `${secondsText(b.seconds, b.nanos)}S`;
  if (!date && !time) return "PT0S";
  return `${sign}P${date}${time ? `T${time}` : ""}`;
}

/** Writes components back out in canonical order, upper case, "." decimals. */
export function formatComponents(negative: boolean, components: DurationComponents): string {
  let date = "";
  let time = "";
  for (const field of DURATION_FIELDS) {
    const value = components[field.key];
    if (value === undefined) continue;
    if (field.time) time += `${value}${field.designator}`;
    else date += `${value}${field.designator}`;
  }
  return `${negative ? "-" : ""}P${date}${time ? `T${time}` : ""}`;
}

function plural(value: string, singular: string, pluralForm: string): string {
  return `${value} ${value === "1" ? singular : pluralForm}`;
}

/** "1 day, 2 hours, 30 minutes" — components as written, zero parts skipped. */
export function describeDuration(parsed: ParsedDuration): string {
  const parts: string[] = [];
  if (parsed.totalNanos !== null && parsed.fromSeconds) {
    const b = breakdown(parsed.totalNanos, true);
    if (b.days) parts.push(plural(`${b.days}`, "day", "days"));
    if (b.hours) parts.push(plural(`${b.hours}`, "hour", "hours"));
    if (b.minutes) parts.push(plural(`${b.minutes}`, "minute", "minutes"));
    if (b.seconds || b.nanos) parts.push(plural(secondsText(b.seconds, b.nanos), "second", "seconds"));
  } else {
    for (const field of DURATION_FIELDS) {
      const value = parsed.components[field.key];
      if (value === undefined || /^0(\.0*)?$/.test(value)) continue;
      parts.push(plural(value, field.singular, field.plural));
    }
  }
  if (parts.length === 0) return "zero";
  return `${parsed.negative ? "minus " : ""}${parts.join(", ")}`;
}
