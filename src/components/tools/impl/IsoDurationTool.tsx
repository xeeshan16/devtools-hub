"use client";

import { TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { InputPanel } from "@/components/tools/InputPanel";
import {
  DURATION_FIELDS,
  TOTAL_UNITS,
  describeDuration,
  formatComponents,
  formatIsoDuration,
  formatQuotient,
  parseDuration,
} from "@/lib/tools/iso-duration";

function ResultRow({ label, value, copyLabel }: { label: string; value: string; copyLabel: string }) {
  return (
    <li className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="font-code text-[13px] break-all text-foreground">{value || "—"}</p>
        <p className="text-[11px] text-muted">{label}</p>
      </div>
      <CopyButton value={value} size="icon" label={copyLabel} disabled={!value} />
    </li>
  );
}

export function IsoDurationTool() {
  const [input, setInput] = useState("");

  const parsed = useMemo(() => parseDuration(input), [input]);
  const duration = parsed.ok ? parsed.value : null;
  const totalNanos = duration?.totalNanos ?? null;

  const isoForms =
    duration === null
      ? []
      : totalNanos === null
        ? [{ label: "Canonical form", value: formatComponents(duration.negative, duration.components) }]
        : [
            { label: "Normalized, with days", value: formatIsoDuration(totalNanos, true) },
            { label: "Hours, minutes and seconds only (Java Duration style)", value: formatIsoDuration(totalNanos, false) },
          ];

  return (
    <div className="space-y-4">
      <InputPanel
        value={input}
        onChange={setInput}
        title="Duration"
        placeholder="Type an ISO 8601 duration such as P1DT2H30M or PT45.5S, or a number of seconds…"
        sample="P1DT2H30M"
        minRows={2}
      />

      {!parsed.ok ? (
        <p role="alert" className="text-danger flex items-start gap-2 text-[13px] leading-6">
          <TriangleAlert className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="break-words">{parsed.error}</span>
        </p>
      ) : null}

      <p aria-live="polite" className="text-sm text-foreground">
        {duration === null ? null : describeDuration(duration)}
      </p>

      {duration !== null && totalNanos === null ? (
        <p className="text-xs text-muted">
          Years and months have no fixed length (a month is 28 to 31 days), so totals are not shown. Use weeks, days or
          smaller units for an exact length.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-foreground">Components</h2>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DURATION_FIELDS.map((field) => (
              <div key={field.key} className="rounded-lg border border-border bg-surface px-3 py-2">
                <dt className="text-[11px] text-muted capitalize">
                  {field.plural} <span className="font-code">({field.designator})</span>
                </dt>
                <dd className="font-code text-[13px] break-all text-foreground">
                  {duration?.components[field.key] ?? "—"}
                </dd>
              </div>
            ))}
          </dl>

          <h2 className="pt-2 text-xs font-semibold text-foreground">ISO 8601</h2>
          <ul className="grid gap-2">
            {(isoForms.length ? isoForms : [{ label: "Normalized form", value: "" }]).map((form) => (
              <ResultRow key={form.label} label={form.label} value={form.value} copyLabel={`Copy ${form.label.toLowerCase()}`} />
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-foreground">Total length</h2>
          <ul className="grid gap-2">
            {TOTAL_UNITS.map((unit) => {
              const total = totalNanos === null ? null : formatQuotient(totalNanos, unit.nanos);
              return (
                <li
                  key={unit.key}
                  className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-code text-[13px] break-all text-foreground">
                      {total ? `${total.exact ? "" : "≈ "}${total.text}` : "—"}
                    </p>
                    <p className="text-[11px] text-muted">{unit.label}</p>
                  </div>
                  <CopyButton
                    value={total ? total.text.replace(/,/g, "") : ""}
                    size="icon"
                    label={`Copy total in ${unit.key}`}
                    disabled={!total}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
