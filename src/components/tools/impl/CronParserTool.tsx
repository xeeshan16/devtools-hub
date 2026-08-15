"use client";

import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { Panel } from "@/components/tools/Panel";
import { CRON_PRESETS, parseCron } from "@/lib/tools/cron";
import { useClientValue } from "@/lib/use-client-value";

/** A short, curated list beats 400+ IANA zones for a tool sidebar. */
const TIME_ZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function CronParserTool() {
  const [expression, setExpression] = useState("");
  const [timeZone, setTimeZone] = useState("UTC");
  // The browser's own zone is offered first, but only when it isn't already in
  // the curated list. It is unknown during the server render.
  const localZone = useClientValue(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && !TIME_ZONES.includes(zone) ? zone : null;
  }, null);

  const result = useMemo(
    () => (expression.trim() ? parseCron(expression, timeZone) : null),
    [expression, timeZone],
  );

  const report = result?.ok ? result.value : null;

  return (
    <div className="space-y-4">
      <Panel
        title="Cron expression"
        actions={
          <label className="flex items-center gap-1.5 text-xs text-muted">
            Time zone
            <select
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              className="h-7 rounded border border-border bg-background px-1.5 text-xs text-foreground focus:outline-none"
            >
              {localZone ? (
                <option value={localZone}>{localZone} (local)</option>
              ) : null}
              {TIME_ZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </label>
        }
        footer={
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1">Presets</span>
            {CRON_PRESETS.map((preset) => (
              <button
                key={preset.expression}
                type="button"
                onClick={() => setExpression(preset.expression)}
                className="rounded border border-border bg-surface-2 px-1.5 py-0.5 hover:border-accent hover:text-foreground"
              >
                {preset.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="p-3">
          <input
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            spellCheck={false}
            aria-label="Cron expression"
            placeholder="*/15 9-17 * * 1-5"
            className="font-code h-11 w-full rounded-md border border-border bg-background px-3 text-base tracking-wide text-foreground placeholder:text-muted focus:outline-none"
          />

          {result && !result.ok ? (
            <p role="alert" className="text-danger mt-2.5 text-xs leading-6">
              {result.error}
            </p>
          ) : null}

          {report ? (
            <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-foreground">
              <span className="text-accent">→</span>
              {report.description}
            </p>
          ) : null}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Fields"
          footer={
            report ? (
              <span>
                {report.hasSeconds
                  ? "6-field form — the leading field is seconds."
                  : "Standard 5-field crontab form."}
              </span>
            ) : undefined
          }
        >
          {report ? (
            <table className="w-full text-left text-[12px]">
              <thead className="text-muted">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 font-medium">Field</th>
                  <th className="px-3 py-2 font-medium">Value</th>
                  <th className="px-3 py-2 font-medium">Allowed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.fields.map((field) => (
                  <tr key={field.name}>
                    <td className="px-3 py-1.5 text-foreground">{field.name}</td>
                    <td className="font-code px-3 py-1.5 text-accent">
                      {field.value}
                    </td>
                    <td className="px-3 py-1.5 text-muted">{field.allowed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-3 text-xs leading-6 text-muted">
              Enter an expression above — or pick a preset — to see each field
              explained and the next five run times.
            </p>
          )}
        </Panel>

        <Panel
          title="Next runs"
          actions={
            report ? (
              <CopyButton
                value={report.nextRuns.map((d) => d.toISOString()).join("\n")}
              />
            ) : undefined
          }
          footer={report ? <span>Shown in {report.timeZone}</span> : undefined}
        >
          {report ? (
            <ol className="divide-y divide-border">
              {report.nextRuns.map((run, index) => (
                <li
                  key={run.toISOString()}
                  className="flex items-baseline gap-3 px-3 py-2"
                >
                  <span className="w-4 shrink-0 text-[11px] tabular-nums text-muted">
                    {index + 1}
                  </span>
                  <span className="font-code text-[13px] text-foreground">
                    {run.toLocaleString("en-GB", {
                      timeZone: report.timeZone,
                      dateStyle: "medium",
                      timeStyle: "medium",
                    })}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="p-3 text-xs leading-6 text-muted">
              Upcoming run times appear here, calculated in the selected time
              zone.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
