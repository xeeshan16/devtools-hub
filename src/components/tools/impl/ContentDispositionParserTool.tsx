"use client";

import { TriangleAlert } from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { InputPanel } from "@/components/tools/InputPanel";
import { Segmented } from "@/components/ui/segmented";
import {
  buildContentDisposition,
  parseContentDisposition,
  type ContentDispositionResult,
} from "@/lib/tools/content-disposition";

const SAMPLE = "Content-Disposition: attachment; filename=\"resume.pdf\"; filename*=UTF-8''r%C3%A9sum%C3%A9.pdf";

const BUILD_TYPES = [
  { value: "attachment", label: "attachment", title: "Download and save the file" },
  { value: "inline", label: "inline", title: "Display the file in the browser" },
] as const;

type BuildType = (typeof BUILD_TYPES)[number]["value"];

function SummaryCard({ value }: { value: ContentDispositionResult }) {
  const rows: [string, ReactNode][] = [
    ["Type", <span key="type" className="font-code font-semibold">{value.type}</span>],
  ];
  if (value.name !== null) rows.push(["Field name", <span key="name" className="font-code">{value.name}</span>]);
  if (value.filename !== null) {
    rows.push([
      "File name",
      <span key="filename">
        <span className="font-code break-all">{value.filename}</span>
        <span className="text-muted"> (from {value.filenameSource})</span>
      </span>,
    ]);
  }
  if (value.extended) {
    rows.push([
      "Encoding",
      <span key="encoding" className="font-code">
        {value.extended.charset}
        {value.extended.language ? `, language ${value.extended.language}` : ""}
      </span>,
    ]);
  }
  if (value.filenameSource === "filename*" && value.fallbackFilename !== null) {
    rows.push(["Fallback", <span key="fallback" className="font-code break-all">{value.fallbackFilename}</span>]);
  }
  if (value.savedAs !== null && value.savedAs !== value.filename) {
    rows.push(["Saved as", <span key="saved" className="font-code break-all">{value.savedAs || "(client picks a name)"}</span>]);
  }

  return (
    <section aria-labelledby="cd-summary" className="rounded-lg border border-border bg-surface p-3">
      <h2 id="cd-summary" className="text-xs font-semibold tracking-wide text-muted uppercase">
        Summary
      </h2>
      <p className={value.knownType ? "mt-2 text-[13px] leading-6 text-foreground" : "mt-2 text-[13px] leading-6 text-muted"}>
        {value.meaning}
      </p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs leading-5">
        {rows.map(([label, content]) => (
          <div key={label} className="contents">
            <dt className="text-muted">{label}</dt>
            <dd className="text-foreground">{content}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ParamsTable({ value }: { value: ContentDispositionResult }) {
  return (
    <section aria-labelledby="cd-params" className="rounded-lg border border-border bg-surface p-3">
      <h2 id="cd-params" className="text-xs font-semibold tracking-wide text-muted uppercase">
        Parameters ({value.params.length})
      </h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">Parameters</caption>
          <thead>
            <tr className="text-muted">
              <th scope="col" className="pb-1 pr-3 font-semibold">
                Parameter
              </th>
              <th scope="col" className="pb-1 font-semibold">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {value.params.map((param, index) => (
              <tr key={`${index}-${param.name}`} className="border-t border-border">
                <th scope="row" className="font-code py-1 pr-3 align-top font-normal text-foreground">
                  {param.name}
                </th>
                <td className="font-code py-1 align-top break-all text-foreground">
                  {param.value ?? <span className="text-muted">(no value)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BuildPanel() {
  const fieldId = useId();
  const [filename, setFilename] = useState("résumé (final).pdf");
  const [type, setType] = useState<BuildType>("attachment");
  const built = useMemo(() => buildContentDisposition(filename, type), [filename, type]);
  const header = built.ok && built.value ? `Content-Disposition: ${built.value}` : "";

  return (
    <section aria-labelledby="cd-build" className="rounded-lg border border-border bg-surface p-3">
      <h2 id="cd-build" className="text-xs font-semibold tracking-wide text-muted uppercase">
        Build a header
      </h2>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor={fieldId} className="block text-xs leading-5 text-muted">
            File name
          </label>
          <input
            id={fieldId}
            type="text"
            value={filename}
            onChange={(event) => setFilename(event.target.value)}
            spellCheck={false}
            autoComplete="off"
            className="font-code mt-1 w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-xs leading-5 text-foreground focus-visible:outline-2 focus-visible:outline-accent"
          />
        </div>
        <Segmented label="Disposition type" options={BUILD_TYPES} value={type} onChange={setType} />
      </div>
      {!built.ok ? (
        <p role="alert" className="text-danger mt-2 flex items-start gap-2 text-xs leading-5">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{built.error}</span>
        </p>
      ) : null}
      {header ? (
        <div className="mt-2 flex items-start gap-2">
          <output htmlFor={fieldId} aria-live="polite" className="font-code min-w-0 flex-1 text-xs leading-5 break-all text-foreground">
            {header}
          </output>
          <CopyButton value={header} size="icon" label="Copy header" />
        </div>
      ) : null}
    </section>
  );
}

export function ContentDispositionParserTool() {
  const [input, setInput] = useState("");

  const result = useMemo(() => parseContentDisposition(input), [input]);
  const value = result.ok ? result.value : null;

  return (
    <div className="space-y-4">
      <InputPanel
        value={input}
        onChange={setInput}
        title="Content-Disposition header"
        placeholder='Paste a Content-Disposition header, e.g. attachment; filename="report.pdf"…'
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
            <section aria-labelledby="cd-warnings" className="rounded-lg border border-border bg-surface p-3">
              <h2 id="cd-warnings" className="text-xs font-semibold tracking-wide text-muted uppercase">
                Warnings ({value.warnings.length})
              </h2>
              <ul className="mt-2 space-y-1">
                {value.warnings.map((warning, index) => (
                  <li key={`${index}-${warning}`} className="text-danger flex items-start gap-2 text-xs leading-5">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <SummaryCard value={value} />
          {value.params.length > 0 ? <ParamsTable value={value} /> : null}
        </div>
      ) : null}

      <BuildPanel />
    </div>
  );
}
