import { CronExpressionParser } from "cron-parser";
import cronstrue from "cronstrue";
import { err, messageOf, ok, type ToolResult } from "./result";

export type CronField = {
  name: string;
  value: string;
  allowed: string;
};

export type CronReport = {
  description: string;
  fields: CronField[];
  nextRuns: Date[];
  hasSeconds: boolean;
  timeZone: string;
};

const FIVE_FIELD: Omit<CronField, "value">[] = [
  { name: "Minute", allowed: "0–59" },
  { name: "Hour", allowed: "0–23" },
  { name: "Day of month", allowed: "1–31" },
  { name: "Month", allowed: "1–12 or JAN–DEC" },
  { name: "Day of week", allowed: "0–7 or SUN–SAT (0 and 7 are Sunday)" },
];

const SECONDS_FIELD: Omit<CronField, "value"> = { name: "Second", allowed: "0–59" };

const ALIASES: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

export function parseCron(
  expression: string,
  timeZone = "UTC",
  count = 5,
  from: Date = new Date(),
): ToolResult<CronReport> {
  const raw = expression.trim().replace(/\s+/g, " ");
  if (!raw) return err("Enter a cron expression.");

  const normalized = ALIASES[raw.toLowerCase()] ?? raw;
  const parts = normalized.split(" ");

  if (parts.length < 5 || parts.length > 6) {
    return err(
      `A cron expression needs 5 fields (or 6 with seconds); this has ${parts.length}.`,
    );
  }

  let description: string;
  try {
    description = cronstrue.toString(normalized, { verbose: true });
  } catch (e) {
    return err(messageOf(e, "Could not interpret that cron expression."));
  }

  const nextRuns: Date[] = [];
  try {
    const interval = CronExpressionParser.parse(normalized, {
      currentDate: from,
      tz: timeZone,
    });
    for (let i = 0; i < count; i++) {
      nextRuns.push(interval.next().toDate());
    }
  } catch (e) {
    return err(messageOf(e, "Could not compute upcoming run times."));
  }

  const hasSeconds = parts.length === 6;
  const schema = hasSeconds ? [SECONDS_FIELD, ...FIVE_FIELD] : FIVE_FIELD;

  return ok({
    description,
    fields: schema.map((field, i) => ({ ...field, value: parts[i] })),
    nextRuns,
    hasSeconds,
    timeZone,
  });
}

export const CRON_PRESETS: { label: string; expression: string }[] = [
  { label: "Every minute", expression: "* * * * *" },
  { label: "Every 5 minutes", expression: "*/5 * * * *" },
  { label: "Every hour, on the hour", expression: "0 * * * *" },
  { label: "Daily at midnight", expression: "0 0 * * *" },
  { label: "Weekdays at 9am", expression: "0 9 * * 1-5" },
  { label: "First of the month", expression: "0 0 1 * *" },
];
