"use client";

import { Info } from "lucide-react";
import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { convertCurl } from "@/lib/tools/curl";

const SAMPLE = `curl -X POST 'https://api.example.com/v1/users?notify=true' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -d '{"name": "Ada Lovelace", "roles": ["admin"]}' \\
  --max-time 10 \\
  --compressed -s`;

export function CurlToFetchTool() {
  const [input, setInput] = useState("");
  const result = useMemo(() => convertCurl(input), [input]);
  const conversion = result.ok ? result.value : null;

  return (
    <div className="space-y-3">
      <div className="grid gap-4 lg:grid-cols-2">
        <InputPanel
          value={input}
          onChange={setInput}
          title="curl command"
          placeholder="Paste a curl command, e.g. from your browser's Copy as cURL…"
          sample={SAMPLE}
        />

        <OutputPanel
          title="JavaScript fetch"
          value={conversion?.code ?? ""}
          error={result.ok ? null : result.error}
          placeholder="The equivalent fetch call appears here."
          footer={
            conversion ? (
              <span className="tabular-nums">
                {conversion.request.method} · {conversion.request.headers.length.toLocaleString()}{" "}
                {conversion.request.headers.length === 1 ? "header" : "headers"}
                {conversion.request.body ? " · body" : ""}
              </span>
            ) : null
          }
        />
      </div>

      {conversion && conversion.warnings.length > 0 ? (
        <section aria-label="Conversion notes" className="rounded-lg border border-border bg-surface p-3">
          <h2 className="mb-2 text-xs font-semibold text-foreground">Notes</h2>
          <ul className="space-y-1.5">
            {conversion.warnings.map((warning) => (
              <li key={warning} className="flex items-start gap-2 text-xs leading-5 text-muted">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="break-words">{warning}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
