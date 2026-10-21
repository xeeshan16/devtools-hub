"use client";

import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Segmented } from "@/components/ui/segmented";
import {
  DEFAULT_LINE_OPTIONS,
  orderHasDirection,
  processLines,
  type LineOptions,
  type LineOrder,
} from "@/lib/tools/line-tools";

const SAMPLE = `api-gateway
worker-10
billing
worker-2

api-gateway
Auth
worker-1
billing  `;

const ORDERS = [
  { value: "original", label: "Original", title: "Keep the input order" },
  { value: "alphabetical", label: "A–Z", title: "Alphabetical, accented letters next to their base letter" },
  { value: "natural", label: "Natural", title: "Alphabetical, with numbers compared by value: file2 before file10" },
  { value: "codepoint", label: "Code point", title: "Raw character codes, like sort in the C locale: capitals before lower case" },
  { value: "length", label: "Length", title: "Shortest line first" },
  { value: "reverse", label: "Reverse", title: "Flip the input order, last line first" },
] as const satisfies readonly { value: LineOrder; label: string; title: string }[];

const DIRECTIONS = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
] as const;

type ToggleKey = "dedupe" | "ignoreCase" | "trim" | "removeBlank";

const TOGGLES: { key: ToggleKey; label: string }[] = [
  { key: "dedupe", label: "Remove duplicates" },
  { key: "ignoreCase", label: "Ignore case" },
  { key: "trim", label: "Trim whitespace" },
  { key: "removeBlank", label: "Remove blank lines" },
];

function plural(count: number, word: string): string {
  return `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;
}

export function LineSorterTool() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<LineOptions>(DEFAULT_LINE_OPTIONS);

  const result = useMemo(() => processLines(input, options), [input, options]);
  const hasDirection = orderHasDirection(options.order);

  function set<K extends keyof LineOptions>(key: K, value: LineOptions[K]) {
    setOptions((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Sort order"
          options={ORDERS}
          value={options.order}
          onChange={(order) => set("order", order)}
        />
        {hasDirection ? (
          <Segmented
            label="Sort direction"
            options={DIRECTIONS}
            value={options.descending ? "desc" : "asc"}
            onChange={(direction) => set("descending", direction === "desc")}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {TOGGLES.map((toggle) => (
          <label
            key={toggle.key}
            className="flex cursor-pointer items-center gap-2 text-xs text-muted select-none"
          >
            <input
              type="checkbox"
              checked={options[toggle.key]}
              onChange={(e) => set(toggle.key, e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--accent)]"
            />
            {toggle.label}
          </label>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InputPanel
          value={input}
          onChange={setInput}
          title="Lines"
          placeholder="Paste a list, one item per line…"
          sample={SAMPLE}
        />

        <OutputPanel
          title="Result"
          value={result.output}
          footer={
            input ? (
              <span className="tabular-nums">
                {plural(result.inputLines, "line")} → {result.outputLines.toLocaleString()}
                {result.duplicatesRemoved > 0
                  ? ` · ${plural(result.duplicatesRemoved, "duplicate")} removed`
                  : ""}
                {result.blankRemoved > 0
                  ? ` · ${plural(result.blankRemoved, "blank line")} removed`
                  : ""}
              </span>
            ) : null
          }
        />
      </div>
    </div>
  );
}
