"use client";

import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { parseHsts, type HstsDirective, type PreloadCheck } from "@/lib/tools/hsts";

const SAMPLE = "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload";

function DirectiveTable({ directives }: { directives: HstsDirective[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface p-3">
      <table className="w-full text-left text-xs">
        <caption className="pb-2 text-left font-semibold tracking-wide text-muted uppercase">
          Directives ({directives.length})
        </caption>
        <thead>
          <tr className="text-muted">
            <th scope="col" className="pb-2 pr-3 font-semibold">
              Directive
            </th>
            <th scope="col" className="pb-2 font-semibold">
              Meaning
            </th>
          </tr>
        </thead>
        <tbody>
          {directives.map((directive, index) => (
            <tr key={`${index}-${directive.name}`} className="border-t border-border">
              <th scope="row" className="font-code py-2 pr-3 align-top font-normal break-all text-foreground">
                {directive.name}
                {directive.value !== null ? <span className="text-muted">={directive.value}</span> : null}
              </th>
              <td className={`py-2 align-top leading-5 ${directive.known ? "text-foreground" : "text-muted"}`}>
                {directive.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreloadChecklist({ checks }: { checks: PreloadCheck[] }) {
  const ready = checks.every((check) => check.passed);
  return (
    <section aria-labelledby="hsts-preload" className="rounded-lg border border-border bg-surface p-3">
      <h2 id="hsts-preload" className="text-xs font-semibold tracking-wide text-muted uppercase">
        Preload list requirements
      </h2>
      <ul className="mt-2 space-y-1">
        {checks.map((check) => (
          <li
            key={check.label}
            className={`flex items-start gap-2 text-xs leading-5 ${check.passed ? "text-foreground" : "text-muted"}`}
          >
            {check.passed ? (
              <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : (
              <CircleX className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            <span>
              <span className="sr-only">{check.passed ? "Met: " : "Not met: "}</span>
              {check.label}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs leading-5 text-muted">
        {ready ? "This header meets the header requirements. " : ""}
        The site must also serve a valid certificate, redirect HTTP to HTTPS on the same host, and send the header on
        the HTTPS response of the bare domain.
      </p>
    </section>
  );
}

export function HstsParserTool() {
  const [input, setInput] = useState("");

  const result = useMemo(() => parseHsts(input), [input]);
  const value = result.ok ? result.value : null;

  return (
    <div className="space-y-4">
      <InputPanel
        value={input}
        onChange={setInput}
        title="Strict-Transport-Security header"
        placeholder="Paste a Strict-Transport-Security header, e.g. max-age=31536000; includeSubDomains…"
        sample={SAMPLE}
        minRows={2}
        spellCheck={false}
      />

      {!result.ok ? (
        <p role="alert" className="text-danger flex items-start gap-2 text-[13px] leading-6">
          <TriangleAlert className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-code break-words">{result.error}</span>
        </p>
      ) : null}

      {value ? (
        <div className="space-y-3">
          {value.warnings.length > 0 ? (
            <section aria-labelledby="hsts-warnings" className="rounded-lg border border-border bg-surface p-3">
              <h2 id="hsts-warnings" className="text-xs font-semibold tracking-wide text-muted uppercase">
                Warnings ({value.warnings.length})
              </h2>
              <ul className="mt-2 space-y-1">
                {value.warnings.map((warning) => (
                  <li key={warning} className="text-danger flex items-start gap-2 text-xs leading-5">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="hsts-summary" className="rounded-lg border border-border bg-surface p-3">
            <h2 id="hsts-summary" className="text-xs font-semibold tracking-wide text-muted uppercase">
              What the browser does
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-6 text-foreground">
              {value.summary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <PreloadChecklist checks={value.preloadChecks} />

          <DirectiveTable directives={value.directives} />
        </div>
      ) : null}
    </div>
  );
}
