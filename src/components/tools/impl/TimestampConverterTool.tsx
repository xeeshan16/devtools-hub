"use client";

import { useEffect, useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { Panel } from "@/components/tools/Panel";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import {
  fromDateString,
  fromUnix,
  nowBreakdown,
  type TimestampBreakdown,
  type TimestampUnit,
} from "@/lib/tools/timestamp";

type Mode = "unix" | "date";

const MODES = [
  { value: "unix", label: "Unix → date" },
  { value: "date", label: "Date → Unix" },
] as const satisfies readonly { value: Mode; label: string }[];

const UNITS = [
  { value: "auto", label: "Auto" },
  { value: "seconds", label: "Seconds" },
  { value: "milliseconds", label: "Milliseconds" },
] as const satisfies readonly { value: TimestampUnit | "auto"; label: string }[];

export function TimestampConverterTool() {
  const [mode, setMode] = useState<Mode>("unix");
  const [unit, setUnit] = useState<TimestampUnit | "auto">("auto");
  const [input, setInput] = useState("");
  const [now, setNow] = useState<TimestampBreakdown | null>(null);

  // The clock only exists on the client; rendering it during SSR would both
  // mismatch on hydration and bake a stale time into the static HTML.
  useEffect(() => {
    const tick = () => setNow(nowBreakdown());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const result = useMemo(() => {
    if (!input.trim()) return null;
    return mode === "unix" ? fromUnix(input, unit) : fromDateString(input);
  }, [input, mode, unit]);

  const breakdown = result?.ok ? result.value : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel
        title="Convert"
        actions={
          <Segmented
            label="Conversion direction"
            options={MODES}
            value={mode}
            onChange={setMode}
          />
        }
        footer={
          mode === "unix" ? (
            <label className="flex items-center gap-2">
              Interpret as
              <Segmented
                label="Timestamp unit"
                options={UNITS}
                value={unit}
                onChange={setUnit}
              />
            </label>
          ) : (
            <span>ISO 8601, RFC 2822 and most common date strings are accepted.</span>
          )
        }
      >
        <div className="space-y-3 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            aria-label={mode === "unix" ? "Unix timestamp" : "Date string"}
            placeholder={
              mode === "unix" ? "1717243200" : "2024-06-01T12:00:00Z"
            }
            className="font-code h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none"
          />

          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setInput(
                  mode === "unix"
                    ? String(Math.floor(Date.now() / 1000))
                    : new Date().toISOString(),
                )
              }
            >
              Use current time
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setInput("")}>
              Clear
            </Button>
          </div>

          {result && !result.ok ? (
            <p role="alert" className="text-danger text-xs leading-6">
              {result.error}
            </p>
          ) : null}

          <div className="rounded-md border border-border bg-background/60 px-3 py-2">
            <p className="text-[10px] font-semibold tracking-wider text-muted uppercase">
              Current Unix time
            </p>
            <p className="font-code mt-1 flex items-center gap-2 text-sm text-foreground">
              <span className="tabular-nums">{now ? now.unix : "—"}</span>
              {now ? <CopyButton value={String(now.unix)} size="icon" /> : null}
            </p>
          </div>
        </div>
      </Panel>

      <Panel
        title="Breakdown"
        footer={
          breakdown ? (
            <span>Local values use your browser time zone: {breakdown.localZone}</span>
          ) : undefined
        }
      >
        {breakdown ? (
          <dl className="divide-y divide-border">
            <Row label="Unix (s)" value={String(breakdown.unix)} copyable />
            <Row label="Unix (ms)" value={String(breakdown.unixMs)} copyable />
            <Row label="ISO 8601" value={breakdown.iso} copyable />
            <Row label="UTC" value={breakdown.utc} />
            <Row label="Local" value={breakdown.local} />
            <Row label="Day" value={breakdown.dayOfWeek} />
            <Row label="Relative" value={breakdown.relative} />
          </dl>
        ) : (
          <p className="p-3 text-xs leading-6 text-muted">
            Enter a value on the left to see it in every common representation —
            seconds, milliseconds, ISO 8601, UTC, your local time zone and a
            relative description.
          </p>
        )}
      </Panel>
    </div>
  );
}

function Row({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <dt className="w-20 shrink-0 text-[11px] tracking-wide text-muted uppercase">
        {label}
      </dt>
      <dd className="font-code min-w-0 flex-1 truncate text-[13px] text-foreground">
        {value}
      </dd>
      {copyable ? <CopyButton value={value} size="icon" /> : null}
    </div>
  );
}
