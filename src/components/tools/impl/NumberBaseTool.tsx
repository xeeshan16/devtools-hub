"use client";

import { TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { InputPanel } from "@/components/tools/InputPanel";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import {
  RADIXES,
  formatInteger,
  integerWidth,
  parseInteger,
  type Radix,
} from "@/lib/tools/number-base";

const BASE_OPTIONS = [
  { value: "2", label: "Binary" },
  { value: "8", label: "Octal" },
  { value: "10", label: "Decimal" },
  { value: "16", label: "Hex" },
] as const satisfies readonly { value: `${Radix}`; label: string }[];

const SAMPLES: Record<Radix, string> = {
  2: "1100_1010_1111_1110",
  8: "0o145376",
  10: "51966",
  16: "0xCAFE",
};

export function NumberBaseTool() {
  const [input, setInput] = useState("");
  const [from, setFrom] = useState<`${Radix}`>("10");
  const [uppercase, setUppercase] = useState(false);
  const [grouped, setGrouped] = useState(false);

  const radix = Number(from) as Radix;
  const parsed = useMemo(() => parseInteger(input, radix), [input, radix]);
  const parsedValue = parsed.ok ? parsed.value : null;

  const width = parsedValue === null ? null : integerWidth(parsedValue);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Input base" options={BASE_OPTIONS} value={from} onChange={setFrom} />

        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={grouped}
            onChange={(e) => setGrouped(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--accent)]"
          />
          Group digits with _
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={uppercase}
            onChange={(e) => setUppercase(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--accent)]"
          />
          Uppercase hex
        </label>
      </div>

      <InputPanel
        value={input}
        onChange={setInput}
        title="Number"
        placeholder="Type an integer, e.g. 255, 0xff or 0b1111_1111…"
        sample={SAMPLES[radix]}
        minRows={3}
      />

      {!parsed.ok ? (
        <p role="alert" className="text-danger flex items-start gap-2 text-[13px] leading-6">
          <TriangleAlert className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-code break-words">{parsed.error}</span>
        </p>
      ) : null}

      <div className="grid gap-3">
        {RADIXES.map(({ radix: base, name, prefix }) => {
          const value =
            parsedValue === null ? "" : formatInteger(parsedValue, base, { uppercase, grouped });
          return (
            <div
              key={base}
              className={cn(
                "flex min-w-0 items-start justify-between gap-2 rounded-lg border bg-surface p-3",
                base === radix && value ? "border-accent" : "border-border",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">
                  {name}{" "}
                  <span className="font-normal text-muted">
                    · base {base}
                    {prefix ? ` · ${prefix}` : ""}
                  </span>
                </p>
                <p className="font-code mt-1 text-[13px] break-all text-muted">{value || "—"}</p>
              </div>
              <CopyButton value={value} size="icon" label={`Copy ${name.toLowerCase()}`} disabled={!value} />
            </div>
          );
        })}
      </div>

      <p aria-live="polite" className="text-xs text-muted">
        {width === null
          ? null
          : `${width.bits.toLocaleString("en-US")} ${width.bits === 1 ? "bit" : "bits"} · ` +
            `fits ${width.unsigned ? `uint${width.unsigned}` : "no unsigned type up to 128 bits"} · ` +
            `fits ${width.signed ? `int${width.signed}` : "no signed type up to 128 bits"}`}
      </p>
    </div>
  );
}
