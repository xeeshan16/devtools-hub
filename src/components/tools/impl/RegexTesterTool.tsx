"use client";

import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Panel } from "@/components/tools/Panel";
import { REGEX_FLAGS, runRegex, type RegexFlag } from "@/lib/tools/regex";
import { cn } from "@/lib/utils";

const SAMPLE_TEXT = `alice@example.com placed order #10482 on 2024-06-01
bob.smith@dev.example.co.uk placed order #10483 on 2024-06-02
carol@test.org cancelled order #10484 on 2024-06-03`;

const SAMPLE_PATTERN = "(?<user>[\\w.]+)@(?<domain>[\\w.]+\\.\\w{2,})";

export function RegexTesterTool() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState<RegexFlag[]>(["g", "m"]);
  const [text, setText] = useState("");
  const [replacement, setReplacement] = useState("");
  const [showReplace, setShowReplace] = useState(false);

  const flagString = useMemo(
    () => REGEX_FLAGS.filter((f) => flags.includes(f.flag)).map((f) => f.flag).join(""),
    [flags],
  );

  const result = useMemo(() => {
    if (!pattern) return null;
    return runRegex(
      pattern,
      flagString,
      text,
      showReplace ? replacement : undefined,
    );
  }, [pattern, flagString, text, replacement, showReplace]);

  const report = result?.ok ? result.value : null;

  function toggleFlag(flag: RegexFlag) {
    setFlags((current) =>
      current.includes(flag)
        ? current.filter((f) => f !== flag)
        : [...current, flag],
    );
  }

  return (
    <div className="space-y-4">
      <Panel
        title="Pattern"
        actions={
          <button
            type="button"
            onClick={() => {
              setPattern(SAMPLE_PATTERN);
              setText(SAMPLE_TEXT);
            }}
            className="rounded px-2 py-1 text-xs text-muted hover:text-foreground"
          >
            Try an example
          </button>
        }
        footer={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {REGEX_FLAGS.map((flag) => (
              <label
                key={flag.flag}
                title={flag.description}
                className="flex cursor-pointer items-center gap-1.5"
              >
                <input
                  type="checkbox"
                  checked={flags.includes(flag.flag)}
                  onChange={() => toggleFlag(flag.flag)}
                  className="h-3 w-3 accent-[var(--accent)]"
                />
                <span className="font-code">{flag.flag}</span>
                <span className="hidden sm:inline">{flag.name}</span>
              </label>
            ))}
          </div>
        }
      >
        <div className="flex items-center gap-1 p-3">
          <span className="font-code text-lg text-muted">/</span>
          <input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            spellCheck={false}
            aria-label="Regular expression"
            placeholder="\\b\\w+@\\w+\\.\\w{2,}\\b"
            className="font-code h-9 min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
          />
          <span className="font-code text-lg text-muted">/</span>
          <span className="font-code w-16 text-sm text-accent">{flagString}</span>
        </div>
      </Panel>

      {result && !result.ok ? (
        <p
          role="alert"
          className="text-danger font-code rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-xs"
        >
          {result.error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <InputPanel
          value={text}
          onChange={setText}
          title="Test string"
          placeholder="Paste the text to match against…"
          minRows={12}
        />

        <OutputPanel
          title="Matches"
          value={report ? report.matches.map((m) => m.value).join("\n") : ""}
          footer={
            report ? (
              <span className="tabular-nums">
                {report.matches.length} match
                {report.matches.length === 1 ? "" : "es"}
              </span>
            ) : undefined
          }
          minRows={12}
        >
          {report && text ? (
            <pre className="font-code m-0 min-h-[18rem] p-3 text-[13px] leading-6 break-words whitespace-pre-wrap">
              {report.segments.map((segment, index) => (
                <span
                  key={index}
                  className={cn(
                    segment.matched
                      ? "rounded-sm bg-accent-soft text-foreground ring-1 ring-accent/40"
                      : "text-muted",
                  )}
                >
                  {segment.text}
                </span>
              ))}
            </pre>
          ) : (
            <p className="p-3 text-xs leading-6 text-muted">
              Matches are highlighted here as you type, with every capture group
              listed below.
            </p>
          )}
        </OutputPanel>
      </div>

      {report && report.matches.length > 0 ? (
        <Panel title="Capture groups" bodyClassName="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="text-muted">
              <tr className="border-b border-border">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Index</th>
                <th className="px-3 py-2 font-medium">Match</th>
                <th className="px-3 py-2 font-medium">Groups</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report.matches.slice(0, 100).map((match, index) => (
                <tr key={`${match.index}-${index}`}>
                  <td className="px-3 py-1.5 tabular-nums text-muted">
                    {index + 1}
                  </td>
                  <td className="px-3 py-1.5 tabular-nums text-muted">
                    {match.index}
                  </td>
                  <td className="font-code px-3 py-1.5 text-foreground">
                    {match.value}
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      {match.groups.length === 0 ? (
                        <span className="text-muted">—</span>
                      ) : (
                        match.groups.map((group) => (
                          <span
                            key={group.name}
                            className="font-code rounded border border-border bg-surface-2 px-1.5 py-0.5"
                          >
                            <span className="text-muted">{group.name}:</span>{" "}
                            <span className="text-accent">
                              {group.value ?? "undefined"}
                            </span>
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ) : null}

      <Panel
        title="Replace"
        actions={
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={showReplace}
              onChange={(e) => setShowReplace(e.target.checked)}
              className="h-3 w-3 accent-[var(--accent)]"
            />
            Enable
          </label>
        }
        footer={
          <span>
            Use <code className="font-code">$1</code> for numbered groups and{" "}
            <code className="font-code">$&lt;name&gt;</code> for named ones.
          </span>
        }
      >
        <div className="space-y-2 p-3">
          <input
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            disabled={!showReplace}
            spellCheck={false}
            aria-label="Replacement string"
            placeholder="$<user> at $<domain>"
            className="font-code h-9 w-full rounded-md border border-border bg-background px-2.5 text-[13px] text-foreground placeholder:text-muted focus:outline-none disabled:opacity-50"
          />
          {showReplace && report?.replaced !== undefined ? (
            <pre className="font-code m-0 rounded-md border border-border bg-background p-2.5 text-[12px] leading-6 break-words whitespace-pre-wrap text-foreground">
              {report.replaced}
            </pre>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
