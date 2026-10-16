"use client";

import { TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { InputPanel } from "@/components/tools/InputPanel";
import { cn } from "@/lib/utils";
import { convertColor, type ContrastResult } from "@/lib/tools/color";

const SAMPLE = "#1e90ff";

export function ColorConverterTool() {
  const [input, setInput] = useState("");
  const [uppercase, setUppercase] = useState(false);

  const result = useMemo(() => convertColor(input, { uppercase }), [input, uppercase]);
  const color = result.ok ? result.value : null;

  const rows = [
    { name: "HEX", value: color?.hex ?? "" },
    { name: "RGB", value: color?.rgb ?? "" },
    { name: "HSL", value: color?.hsl ?? "" },
  ];

  // <input type="color"> only accepts opaque lowercase #rrggbb.
  const pickerValue = color ? color.hex.slice(0, 7).toLowerCase() : "#000000";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="color"
            value={pickerValue}
            onChange={(e) => setInput(e.target.value)}
            className="h-7 w-10 cursor-pointer rounded border border-border bg-surface p-0.5"
          />
          Pick a color
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
        title="Color"
        placeholder="Type a color, e.g. #1e90ff, rgb(30 144 255) or hsl(210, 100%, 56%)…"
        sample={SAMPLE}
        minRows={2}
      />

      {!result.ok ? (
        <p role="alert" className="text-danger flex items-start gap-2 text-[13px] leading-6">
          <TriangleAlert className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-code break-words">{result.error}</span>
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
        <div
          role="img"
          aria-label={color ? `Swatch of ${color.hex}` : "No color yet"}
          className="min-h-24 rounded-lg border border-border"
          style={
            color
              ? { backgroundColor: color.hex }
              : {
                  backgroundImage:
                    "repeating-linear-gradient(45deg, transparent 0 8px, var(--border) 8px 9px)",
                }
          }
        />

        <div className="grid gap-3">
          {rows.map(({ name, value }) => (
            <div
              key={name}
              className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">{name}</p>
                <p className="font-code mt-1 text-[13px] break-all text-muted">{value || "—"}</p>
              </div>
              <CopyButton value={value} size="icon" label={`Copy ${name.toLowerCase()}`} disabled={!value} />
            </div>
          ))}
        </div>
      </div>

      {color ? (
        <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
          <ContrastTile label="On white" background="#ffffff" foreground={color.hex} contrast={color.contrast.white} />
          <ContrastTile label="On black" background="#000000" foreground={color.hex} contrast={color.contrast.black} />
        </div>
      ) : null}
    </div>
  );
}

function ContrastTile({
  label,
  background,
  foreground,
  contrast,
}: {
  label: string;
  background: string;
  foreground: string;
  contrast: ContrastResult;
}) {
  const passes = contrast.level !== "Fail";
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
      <span
        aria-hidden
        className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md border border-border text-lg font-semibold"
        style={{ backgroundColor: background, color: foreground }}
      >
        Aa
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">
          {/* Truncate, never round up: WCAG thresholds apply to the exact ratio. */}
          {label} · {(Math.floor(contrast.ratio * 100) / 100).toFixed(2)}:1
        </p>
        <p className={cn("mt-1 text-xs", passes ? "text-muted" : "text-danger")}>
          WCAG {contrast.level === "Fail" ? "fails even for large text" : contrast.level}
        </p>
      </div>
    </div>
  );
}
