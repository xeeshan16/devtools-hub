"use client";

import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Segmented } from "@/components/ui/segmented";
import {
  formatJson,
  jsonStats,
  type IndentStyle,
} from "@/lib/tools/json-formatter";

const SAMPLE = `{"name":"devtools-hub","version":"1.0.0","private":true,"engines":{"node":">=20"},"keywords":["json","formatter","validator"]}`;

const INDENT_OPTIONS = [
  { value: "2", label: "2", title: "Two spaces" },
  { value: "4", label: "4", title: "Four spaces" },
  { value: "tab", label: "Tab", title: "Tab characters" },
  { value: "minify", label: "Minify", title: "Strip all whitespace" },
] as const satisfies readonly {
  value: IndentStyle;
  label: string;
  title: string;
}[];

export function JsonFormatterTool() {
  const [input, setInput] = useState("");
  const [style, setStyle] = useState<IndentStyle>("2");

  const result = useMemo(() => formatJson(input, style), [input, style]);
  const stats = useMemo(
    () => (result.ok && input.trim() ? jsonStats(input) : null),
    [result.ok, input],
  );

  return (
    <div className="space-y-3">
      {/* The mode switch lives above the panels rather than in the output
          header, where it would crowd out the copy button on narrow columns. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Indentation</span>
        <Segmented
          label="Indentation"
          options={INDENT_OPTIONS}
          value={style}
          onChange={setStyle}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InputPanel
          value={input}
          onChange={setInput}
          title="JSON input"
          placeholder='Paste JSON here, e.g. {"hello":"world"}'
          sample={SAMPLE}
        />

        <OutputPanel
          title={style === "minify" ? "Minified" : "Formatted"}
          value={result.ok ? result.value : ""}
          error={result.ok ? null : result.error}
          placeholder="Valid JSON is formatted here as you type."
          footer={
            stats ? (
              <>
                <span className="tabular-nums">{stats.keys} keys</span>
                <span className="tabular-nums">{stats.objects} objects</span>
                <span className="tabular-nums">{stats.arrays} arrays</span>
                <span className="tabular-nums">depth {stats.depth}</span>
                <span className="tabular-nums">{stats.bytes} B</span>
              </>
            ) : undefined
          }
        />
      </div>
    </div>
  );
}
