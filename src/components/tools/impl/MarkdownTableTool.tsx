"use client";

import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Segmented } from "@/components/ui/segmented";
import {
  toMarkdownTable,
  type TableAlignment,
  type TableDelimiter,
} from "@/lib/tools/markdown-table";

const DELIMITERS = [
  { value: "auto", label: "Auto" },
  { value: ",", label: "Comma" },
  { value: ";", label: "Semicolon" },
  { value: "\t", label: "Tab" },
] as const satisfies readonly { value: TableDelimiter; label: string }[];

const ALIGNMENTS = [
  { value: "none", label: "Default" },
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
] as const satisfies readonly { value: TableAlignment; label: string }[];

const SAMPLE = `Tool\tCategory\tRuns in browser
JSON Formatter\tFormatting\tyes
Regex Tester\tText & Data\tyes
cURL to Fetch\tFormatting\tyes`;

export function MarkdownTableTool() {
  const [input, setInput] = useState("");
  const [delimiter, setDelimiter] = useState<TableDelimiter>("auto");
  const [alignment, setAlignment] = useState<TableAlignment>("none");
  const [pretty, setPretty] = useState(true);

  const result = useMemo(
    () => toMarkdownTable(input, { delimiter, alignment, pretty }),
    [input, delimiter, alignment, pretty],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Delimiter"
          options={DELIMITERS}
          value={delimiter}
          onChange={setDelimiter}
        />
        <Segmented
          label="Column alignment"
          options={ALIGNMENTS}
          value={alignment}
          onChange={setAlignment}
        />
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={pretty}
            onChange={(e) => setPretty(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--accent)]"
          />
          Align columns in the source
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InputPanel
          value={input}
          onChange={setInput}
          title="CSV / TSV"
          placeholder="Paste CSV, or cells copied from a spreadsheet…"
          sample={SAMPLE}
          minRows={16}
        />
        <OutputPanel
          title="Markdown"
          value={result.ok ? result.value : ""}
          error={result.ok ? null : result.error}
          minRows={16}
        />
      </div>
    </div>
  );
}
