"use client";

import { TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { InputPanel } from "@/components/tools/InputPanel";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import {
  BIT,
  BYTE,
  UNIT_GROUPS,
  convertDataSize,
  humanizeDataSize,
  parseDataSize,
  type DataSize,
  type DataUnit,
} from "@/lib/tools/data-size";

const BARE_UNITS = [
  { value: "byte", label: "Bytes", title: "A number without a unit is read as bytes" },
  { value: "bit", label: "Bits", title: "A number without a unit is read as bits" },
] as const;

function isInputUnit(size: DataSize | null, unit: DataUnit): boolean {
  return size !== null && size.unit.kind === unit.kind && size.unit.bits === unit.bits;
}

export function DataSizeConverterTool() {
  const [input, setInput] = useState("");
  const [bare, setBare] = useState<"byte" | "bit">("byte");

  const parsed = useMemo(
    () => parseDataSize(input, bare === "bit" ? BIT : BYTE),
    [input, bare],
  );
  const size = parsed.ok ? parsed.value : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Numbers without a unit" options={BARE_UNITS} value={bare} onChange={setBare} />
        <p className="text-xs text-muted">
          <span className="font-code">B</span> is bytes, <span className="font-code">b</span> is bits:{" "}
          <span className="font-code">MB</span> vs <span className="font-code">Mb</span>
        </p>
      </div>

      <InputPanel
        value={input}
        onChange={setInput}
        title="Size"
        placeholder="Type a size, e.g. 1.5 GiB, 500 MB, 100 Mb or 1,048,576…"
        sample="1.5 GiB"
        minRows={2}
      />

      {!parsed.ok ? (
        <p role="alert" className="text-danger flex items-start gap-2 text-[13px] leading-6">
          <TriangleAlert className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="break-words">{parsed.error}</span>
        </p>
      ) : null}

      <p aria-live="polite" className="text-xs text-muted">
        {size === null
          ? null
          : `${humanizeDataSize(size, 1000)} in decimal units · ${humanizeDataSize(size, 1024)} in binary units`}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {UNIT_GROUPS.map((group) => (
          <section key={group.title} className="space-y-2">
            <h2 className="text-xs font-semibold text-foreground">{group.title}</h2>
            <ul className="grid gap-2">
              {group.units.map((unit) => {
                const value = size === null ? null : convertDataSize(size, unit);
                const text = value ? `${value.exact ? "" : "≈ "}${value.text}` : "";
                return (
                  <li
                    key={unit.symbol}
                    className={cn(
                      "flex min-w-0 items-center justify-between gap-2 rounded-lg border bg-surface px-3 py-2",
                      isInputUnit(size, unit) ? "border-accent" : "border-border",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-code text-[13px] break-all text-foreground">
                        {text || "—"} <span className="text-muted">{unit.symbol}</span>
                      </p>
                      <p className="text-[11px] text-muted">{unit.name}s</p>
                    </div>
                    <CopyButton
                      value={value ? value.text.replace(/,/g, "") : ""}
                      size="icon"
                      label={`Copy value in ${unit.name}s`}
                      disabled={!value}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
