"use client";

import { Check, Info, TriangleAlert, X } from "lucide-react";
import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Panel } from "@/components/tools/Panel";
import { checkRange } from "@/lib/tools/semver";
import { cn } from "@/lib/utils";

const SAMPLE_RANGE = "^1.4.0";

const SAMPLE_VERSIONS = `1.3.9
1.4.0
1.4.2
1.5.0-beta.1
1.5.0
1.12.3
2.0.0-rc.1
2.0.0
2.1.0`;

function plural(count: number, word: string): string {
  return `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;
}

export function SemverCheckerTool() {
  const [range, setRange] = useState("");
  const [versions, setVersions] = useState("");

  const result = useMemo(() => checkRange(range, versions), [range, versions]);
  const report = result.ok ? result.value : null;
  const matching = report ? report.versions.filter((v) => v.satisfies).map((v) => v.text) : [];

  return (
    <div className="space-y-4">
      <Panel
        title="Range"
        actions={
          !range && !versions ? (
            <button
              type="button"
              onClick={() => {
                setRange(SAMPLE_RANGE);
                setVersions(SAMPLE_VERSIONS);
              }}
              className="rounded px-2 py-1 text-xs text-muted hover:text-foreground"
            >
              Try an example
            </button>
          ) : null
        }
        footer={
          report ? (
            <span>
              Means <span className="font-code text-foreground">{report.expanded}</span>
              {report.expanded === "*" ? " (any release)" : ""}
            </span>
          ) : (
            <span>Leave empty to match any release and just sort the list.</span>
          )
        }
      >
        <div className="p-3">
          <input
            value={range}
            onChange={(e) => setRange(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            aria-label="Version range"
            aria-invalid={!result.ok}
            aria-describedby={!result.ok ? "semver-range-error" : undefined}
            placeholder="^1.2.3, ~2.1, >=1.0.0 <2, 1.x || 2.x…"
            className="font-code h-9 w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
          />
        </div>
      </Panel>

      {!result.ok ? (
        <p
          id="semver-range-error"
          role="alert"
          className="text-danger flex items-start gap-2 text-[13px] leading-6"
        >
          <TriangleAlert className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-code break-words">{result.error}</span>
        </p>
      ) : null}

      {report && report.invalid.length > 0 ? (
        <p className="flex items-start gap-2 text-xs leading-5 text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Skipped {report.invalid.length.toLocaleString()}{" "}
            {report.invalid.length === 1 ? "entry" : "entries"} that{" "}
            {report.invalid.length === 1 ? "is" : "are"} not a full semantic version:{" "}
            <span className="font-code text-foreground break-all">
              {report.invalid.slice(0, 10).join(", ")}
              {report.invalid.length > 10 ? ", …" : ""}
            </span>
          </span>
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <InputPanel
          value={versions}
          onChange={setVersions}
          title="Versions"
          placeholder="Paste versions, one per line, a JSON array or the output of npm view <package> versions…"
          minRows={12}
        />

        <OutputPanel
          title="Matching versions"
          value={matching.join("\n")}
          minRows={12}
          footer={
            report && report.versions.length > 0 ? (
              <span className="tabular-nums">
                {report.matches.toLocaleString()} of {plural(report.versions.length, "version")} match
                {report.highest ? (
                  <>
                    {" "}
                    · highest <span className="font-code text-foreground">{report.highest}</span>
                  </>
                ) : null}
              </span>
            ) : null
          }
        >
          {report && report.versions.length > 0 ? (
            <ul className="font-code m-0 min-h-[18rem] list-none p-3 text-[13px] leading-6">
              {report.versions.map((v) => (
                <li
                  key={v.text}
                  className={cn("flex items-center gap-2", v.satisfies ? "text-foreground" : "text-muted")}
                >
                  {v.satisfies ? (
                    <Check className="text-success h-3.5 w-3.5 shrink-0" aria-hidden />
                  ) : (
                    <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  )}
                  <span className="break-all">{v.text}</span>
                  <span className="sr-only">{v.satisfies ? "matches" : "does not match"}</span>
                  {v.text === report.highest ? (
                    <span className="rounded bg-accent-soft px-1.5 text-[11px] text-foreground">highest</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-3 text-xs leading-6 text-muted">
              Every version is listed here newest first, with the ones the range accepts ticked. Copy
              gives you just the matching versions.
            </p>
          )}
        </OutputPanel>
      </div>
    </div>
  );
}
