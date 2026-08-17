"use client";

import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { InputPanel } from "@/components/tools/InputPanel";
import { CASES, convertAllCases } from "@/lib/tools/case-converter";

const SAMPLE = "user_first_name";

export function CaseConverterTool() {
  const [input, setInput] = useState("");

  const results = useMemo(() => convertAllCases(input), [input]);

  return (
    <div className="space-y-4">
      <InputPanel
        value={input}
        onChange={setInput}
        title="Text or identifier"
        placeholder="Paste text, or an identifier like user_first_name or userFirstName…"
        sample={SAMPLE}
        minRows={4}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {CASES.map((c) => (
          <div
            key={c.id}
            className="flex min-w-0 items-start justify-between gap-2 rounded-lg border border-border bg-surface p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">
                {c.label}
              </p>
              <p
                title={results[c.id] || undefined}
                className="font-code mt-1 truncate text-[13px] text-muted"
              >
                {results[c.id] || <span className="text-muted">—</span>}
              </p>
            </div>
            <CopyButton
              value={results[c.id]}
              size="icon"
              label={`Copy ${c.label}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
