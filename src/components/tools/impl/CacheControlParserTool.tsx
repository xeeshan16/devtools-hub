"use client";

import { Info, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { parseCacheControl, type CacheDirective } from "@/lib/tools/cache-control";

const SAMPLE = "Cache-Control: public, max-age=60, s-maxage=86400, stale-while-revalidate=30, stale-if-error=86400";

const APPLIES_LABEL: Record<NonNullable<CacheDirective["appliesTo"]>, string> = {
  request: "Request",
  response: "Response",
  both: "Request & response",
};

function DirectiveTable({ directives }: { directives: CacheDirective[] }) {
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
            <th scope="col" className="pb-2 pr-3 font-semibold">
              Applies to
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
              <td className="py-2 pr-3 align-top whitespace-nowrap text-muted">
                {directive.appliesTo ? APPLIES_LABEL[directive.appliesTo] : "Unknown"}
              </td>
              <td className="py-2 align-top leading-5 text-foreground">{directive.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CacheControlParserTool() {
  const [input, setInput] = useState("");

  const result = useMemo(() => parseCacheControl(input), [input]);
  const value = result.ok ? result.value : null;

  return (
    <div className="space-y-4">
      <InputPanel
        value={input}
        onChange={setInput}
        title="Cache-Control header"
        placeholder="Paste a Cache-Control header, e.g. public, max-age=3600…"
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
            <section aria-labelledby="cache-control-warnings" className="rounded-lg border border-border bg-surface p-3">
              <h2 id="cache-control-warnings" className="text-xs font-semibold tracking-wide text-muted uppercase">
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

          {value.context === "response" ? (
            <section aria-labelledby="cache-control-summary" className="rounded-lg border border-border bg-surface p-3">
              <h2 id="cache-control-summary" className="text-xs font-semibold tracking-wide text-muted uppercase">
                What caches do with this response
              </h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-6 text-foreground">
                {value.summary.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="flex items-start gap-2 text-xs leading-5 text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                These are request directives: they tell caches what the client will accept, rather than how to store a
                response.
              </span>
            </p>
          )}

          <DirectiveTable directives={value.directives} />
        </div>
      ) : null}
    </div>
  );
}
