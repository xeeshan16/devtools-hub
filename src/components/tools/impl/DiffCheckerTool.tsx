"use client";

import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { Panel } from "@/components/tools/Panel";
import { Segmented } from "@/components/ui/segmented";
import { diffStats, diffText, type DiffMode, type DiffOp, type DiffPart } from "@/lib/tools/diff";
import { cn } from "@/lib/utils";

const SAMPLE_BEFORE = `Fast, reliable developer tools.
Built for daily use.
Runs in your browser.`;

const SAMPLE_AFTER = `Fast, private developer tools.
Built for daily use.
Runs entirely in your browser.
No sign-up required.`;

const MODES = [
  { value: "line", label: "Line", title: "Diff line by line" },
  { value: "word", label: "Word", title: "Diff word by word" },
] as const satisfies readonly { value: DiffMode; label: string; title: string }[];

export function DiffCheckerTool() {
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [mode, setMode] = useState<DiffMode>("line");

  const result = useMemo(() => diffText(before, after, mode), [before, after, mode]);
  const parts = result.ok ? result.value : [];
  const stats = result.ok ? diffStats(result.value, mode) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <InputPanel
          value={before}
          onChange={setBefore}
          title="Before"
          placeholder="Paste the original text…"
          sample={SAMPLE_BEFORE}
          minRows={10}
        />
        <InputPanel
          value={after}
          onChange={setAfter}
          title="After"
          placeholder="Paste the changed text…"
          sample={SAMPLE_AFTER}
          minRows={10}
        />
      </div>

      <Panel
        title="Diff"
        actions={
          <Segmented
            label="Diff granularity"
            options={MODES}
            value={mode}
            onChange={setMode}
          />
        }
        footer={
          stats ? (
            <>
              <span className="text-success tabular-nums">+{stats.additions}</span>
              <span className="text-danger tabular-nums">-{stats.deletions}</span>
              <span className="tabular-nums">{stats.unchanged} unchanged</span>
            </>
          ) : undefined
        }
        bodyClassName="overflow-auto"
      >
        {!result.ok ? (
          <p role="alert" className="text-danger p-3 text-[13px] leading-6">
            {result.error}
          </p>
        ) : !before && !after ? (
          <p className="p-3 text-xs leading-6 text-muted">
            Paste text into both panels above to see the diff here.
          </p>
        ) : mode === "line" ? (
          <LineDiff parts={parts} />
        ) : (
          <WordDiff parts={parts} />
        )}
      </Panel>
    </div>
  );
}

const GUTTER_CLASS: Record<DiffOp, string> = {
  add: "text-success",
  remove: "text-danger",
  equal: "text-muted",
};

const ROW_CLASS: Record<DiffOp, string> = {
  add: "bg-success/10",
  remove: "bg-danger/10",
  equal: "",
};

function LineDiff({ parts }: { parts: DiffPart[] }) {
  // Each part can span several newline-joined lines (Myers merges consecutive
  // same-type tokens into one run); split back out so every line gets its own
  // gutter mark, the way a unified diff reads.
  const rows: { type: DiffOp; text: string }[] = [];
  for (const part of parts) {
    const lines = part.value.split("\n");
    if (lines[lines.length - 1] === "") lines.pop();
    for (const text of lines) rows.push({ type: part.type, text });
  }

  return (
    <div className="font-code py-1 text-[12.5px] leading-6">
      {rows.map((row, i) => (
        <div key={i} className={cn("flex gap-2 px-3", ROW_CLASS[row.type])}>
          <span className={cn("w-3 shrink-0 select-none", GUTTER_CLASS[row.type])}>
            {row.type === "add" ? "+" : row.type === "remove" ? "−" : ""}
          </span>
          <span className="min-w-0 flex-1 break-words whitespace-pre-wrap text-foreground">
            {row.text || " "}
          </span>
        </div>
      ))}
    </div>
  );
}

function WordDiff({ parts }: { parts: DiffPart[] }) {
  return (
    <pre className="font-code m-0 p-3 text-[13px] leading-6 whitespace-pre-wrap break-words">
      {parts.map((part, i) => (
        <span
          key={i}
          className={cn(
            part.type === "add" && "rounded-sm bg-success/20 text-foreground",
            part.type === "remove" &&
              "rounded-sm bg-danger/20 text-foreground line-through decoration-danger/70",
          )}
        >
          {part.value}
        </span>
      ))}
    </pre>
  );
}
