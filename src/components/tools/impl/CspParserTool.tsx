"use client";

import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { parseCsp, type CspDirective, type CspEffectiveSource, type CspFinding, type CspPolicy } from "@/lib/tools/csp";

const SAMPLE =
  "Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.example.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; report-uri /csp-reports";

const SEVERITY_LABEL: Record<CspFinding["severity"], string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const SEVERITY_CLASS: Record<CspFinding["severity"], string> = {
  high: "text-danger",
  medium: "text-danger",
  low: "text-muted",
};

function Findings({ findings, id }: { findings: CspFinding[]; id: string }) {
  return (
    <section aria-labelledby={id} className="rounded-lg border border-border bg-surface p-3">
      <h3 id={id} className="text-xs font-semibold tracking-wide text-muted uppercase">
        Findings ({findings.length})
      </h3>
      {findings.length === 0 ? (
        <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-foreground">
          <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>No problems found.</span>
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {findings.map((finding, index) => (
            <li key={`${index}-${finding.message}`} className={`flex items-start gap-2 text-xs leading-5 ${SEVERITY_CLASS[finding.severity]}`}>
              {finding.severity === "low" ? (
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : (
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
              <span>
                <span className="font-semibold">{SEVERITY_LABEL[finding.severity]}:</span> {finding.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EffectiveTable({ effective }: { effective: CspEffectiveSource[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface p-3">
      <table className="w-full text-left text-xs">
        <caption className="pb-2 text-left font-semibold tracking-wide text-muted uppercase">
          What each resource type may load
        </caption>
        <thead>
          <tr className="text-muted">
            <th scope="col" className="pb-2 pr-3 font-semibold">
              Directive
            </th>
            <th scope="col" className="pb-2 pr-3 font-semibold">
              Governed by
            </th>
            <th scope="col" className="pb-2 font-semibold">
              Allowed sources
            </th>
          </tr>
        </thead>
        <tbody>
          {effective.map((entry) => (
            <tr key={entry.directive} className="border-t border-border">
              <th scope="row" className="font-code py-2 pr-3 align-top font-normal whitespace-nowrap text-foreground">
                {entry.directive}
              </th>
              <td className="font-code py-2 pr-3 align-top whitespace-nowrap text-muted">
                {entry.from === null ? "—" : entry.from === entry.directive ? "itself" : entry.from}
              </td>
              <td className="font-code py-2 align-top leading-5 break-all text-foreground">
                {entry.values === null ? (
                  <span className="text-danger font-sans">Unrestricted</span>
                ) : entry.values.length === 0 ? (
                  <span className="font-sans text-muted">Nothing (empty list)</span>
                ) : (
                  entry.values.join(" ")
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DirectiveTable({ directives }: { directives: CspDirective[] }) {
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
              Value
            </th>
            <th scope="col" className="pb-2 font-semibold">
              Meaning
            </th>
          </tr>
        </thead>
        <tbody>
          {directives.map((directive) => (
            <tr key={directive.name} className="border-t border-border">
              <th scope="row" className="font-code py-2 pr-3 align-top font-normal whitespace-nowrap text-foreground">
                {directive.name}
              </th>
              <td className="font-code py-2 pr-3 align-top leading-5 break-all text-foreground">
                {directive.values.length > 0 ? directive.values.join(" ") : <span className="text-muted">—</span>}
              </td>
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

function PolicyView({ policy, index, total }: { policy: CspPolicy; index: number; total: number }) {
  const mode = policy.reportOnly ? "Report-only" : "Enforced";
  return (
    <section aria-labelledby={`csp-policy-${index}`} className="space-y-3">
      <h2 id={`csp-policy-${index}`} className="text-[13px] font-semibold text-foreground">
        {total > 1 ? `Policy ${index + 1} · ${mode}` : `${mode} policy`}
      </h2>
      {policy.reportOnly ? (
        <p className="flex items-start gap-2 text-xs leading-5 text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Report-only: browsers report violations but block nothing.</span>
        </p>
      ) : null}
      <Findings findings={policy.findings} id={`csp-findings-${index}`} />
      <EffectiveTable effective={policy.effective} />
      {policy.directives.length > 0 ? <DirectiveTable directives={policy.directives} /> : null}
    </section>
  );
}

export function CspParserTool() {
  const [input, setInput] = useState("");

  const result = useMemo(() => parseCsp(input), [input]);
  const value = result.ok ? result.value : null;

  return (
    <div className="space-y-4">
      <InputPanel
        value={input}
        onChange={setInput}
        title="Content-Security-Policy header"
        placeholder="Paste a Content-Security-Policy header, e.g. default-src 'self'; img-src 'self' data:…"
        sample={SAMPLE}
        minRows={3}
        spellCheck={false}
      />

      {!result.ok ? (
        <p role="alert" className="text-danger flex items-start gap-2 text-[13px] leading-6">
          <TriangleAlert className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-code break-words">{result.error}</span>
        </p>
      ) : null}

      {value ? (
        <div className="space-y-6">
          {value.warnings.map((warning) => (
            <p key={warning} className="text-danger flex items-start gap-2 text-xs leading-5">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{warning}</span>
            </p>
          ))}
          {value.policies.map((policy, index) => (
            <PolicyView key={index} policy={policy} index={index} total={value.policies.length} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
