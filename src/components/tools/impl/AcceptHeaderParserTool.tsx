"use client";

import { TriangleAlert } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { Segmented } from "@/components/ui/segmented";
import {
  negotiate,
  parseAcceptHeader,
  type AcceptHeaderResult,
  type AcceptKind,
  type AcceptMode,
  type AcceptRange,
} from "@/lib/tools/accept-header";

const MODES = [
  { value: "auto", label: "Auto", title: "Detect from the header name or the values" },
  { value: "accept", label: "Accept", title: "Media types, e.g. text/html, application/json" },
  { value: "accept-language", label: "Language", title: "Accept-Language: language tags, e.g. en-US" },
  { value: "accept-encoding", label: "Encoding", title: "Accept-Encoding: content codings, e.g. gzip, br" },
  { value: "accept-charset", label: "Charset", title: "Accept-Charset: character sets, e.g. utf-8" },
] as const satisfies readonly { value: AcceptMode; label: string; title: string }[];

const SAMPLES: Record<AcceptMode, string> = {
  auto: "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "de-CH, de;q=0.9, en-US;q=0.8, en;q=0.7, *;q=0.5",
  "accept-encoding": "gzip, deflate, br, zstd",
  "accept-charset": "utf-8, iso-8859-1;q=0.5",
};

const OFFERS: Record<AcceptKind, string> = {
  accept: "application/json\ntext/html",
  "accept-language": "en\nde\nfr",
  "accept-encoding": "br\ngzip\nidentity",
  "accept-charset": "utf-8",
};

const KIND_LABELS: Record<AcceptKind, string> = {
  accept: "Accept",
  "accept-language": "Accept-Language",
  "accept-encoding": "Accept-Encoding",
  "accept-charset": "Accept-Charset",
};

function formatRange(range: AcceptRange): string {
  return range.value + range.params.map(({ name, value }) => `;${name}=${value}`).join("");
}

function RangeTable({ title, ranges, id }: { title: string; ranges: AcceptRange[]; id: string }) {
  return (
    <section aria-labelledby={id} className="rounded-lg border border-border bg-surface p-3">
      <h2 id={id} className="text-xs font-semibold tracking-wide text-muted uppercase">
        {title} ({ranges.length})
      </h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-muted">
              <th scope="col" className="pb-1 pr-3 font-semibold">
                Value
              </th>
              <th scope="col" className="pb-1 pr-3 font-semibold">
                q
              </th>
              <th scope="col" className="pb-1 font-semibold">
                Meaning
              </th>
            </tr>
          </thead>
          <tbody>
            {ranges.map((range) => (
              <tr key={`${range.index}-${range.value}`} className="border-t border-border">
                <th scope="row" className="font-code py-1 pr-3 align-top font-normal break-all text-foreground">
                  {formatRange(range)}
                </th>
                <td className="font-code py-1 pr-3 align-top tabular-nums text-foreground">{range.q}</td>
                <td className="py-1 align-top text-foreground">{range.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Negotiation({ result }: { result: AcceptHeaderResult }) {
  const [offers, setOffers] = useState(OFFERS[result.kind]);
  const fieldId = useId();

  const outcome = useMemo(() => negotiate(result, offers.split(/[\n,]/)), [result, offers]);

  return (
    <section aria-labelledby={`${fieldId}-heading`} className="rounded-lg border border-border bg-surface p-3">
      <h2 id={`${fieldId}-heading`} className="text-xs font-semibold tracking-wide text-muted uppercase">
        Negotiate
      </h2>
      <label htmlFor={fieldId} className="mt-2 block text-xs leading-5 text-muted">
        What the server can send, one per line, in its own order of preference
      </label>
      <textarea
        id={fieldId}
        value={offers}
        onChange={(event) => setOffers(event.target.value)}
        rows={3}
        spellCheck={false}
        className="font-code mt-1 w-full rounded-md border border-border bg-transparent p-2 text-xs leading-5 text-foreground focus-visible:outline-2 focus-visible:outline-accent"
      />
      {outcome.entries.length > 0 ? (
        <>
          <p className="mt-2 text-[13px] leading-6 text-foreground" aria-live="polite">
            {outcome.best ? (
              <>
                The server should send <span className="font-code font-semibold">{outcome.best}</span>.
              </>
            ) : (
              <>
                {result.kind === "accept-encoding"
                  ? "None of these is acceptable; the server should send the response without a content coding."
                  : "None of these is acceptable; the server can send its default anyway or respond with 406 Not Acceptable."}
              </>
            )}
          </p>
          <ol className="mt-1 space-y-0.5">
            {outcome.entries.map((entry, index) => (
              <li key={`${index}-${entry.value}`} className="text-xs leading-5">
                <span className="font-code text-foreground">{entry.value}</span>
                <span className={entry.q > 0 ? "text-foreground" : "text-muted"}>
                  {" "}
                  — q={entry.q}
                  {entry.matchedBy
                    ? ` via ${entry.matchedBy}`
                    : entry.q > 0
                      ? " (identity is acceptable unless refused)"
                      : " (not listed, so not acceptable)"}
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </section>
  );
}

export function AcceptHeaderParserTool() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<AcceptMode>("auto");

  const result = useMemo(() => parseAcceptHeader(input, mode), [input, mode]);
  const value = result.ok ? result.value : null;

  return (
    <div className="space-y-4">
      <Segmented label="Header type" options={MODES} value={mode} onChange={setMode} />

      <InputPanel
        value={input}
        onChange={setInput}
        title={mode === "auto" ? "Accept header" : `${KIND_LABELS[mode]} header`}
        placeholder="Paste an Accept, Accept-Language, Accept-Encoding or Accept-Charset header…"
        sample={SAMPLES[mode]}
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
        <div className="space-y-3">
          <p className="text-xs leading-5 text-muted">
            Read as <span className="font-semibold text-foreground">{KIND_LABELS[value.kind]}</span>, most preferred first.
          </p>

          {value.warnings.length > 0 ? (
            <section aria-labelledby="accept-warnings" className="rounded-lg border border-border bg-surface p-3">
              <h2 id="accept-warnings" className="text-xs font-semibold tracking-wide text-muted uppercase">
                Warnings ({value.warnings.length})
              </h2>
              <ul className="mt-2 space-y-1">
                {value.warnings.map((warning, warningIndex) => (
                  <li key={`${warningIndex}-${warning}`} className="text-danger flex items-start gap-2 text-xs leading-5">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {value.ranges.length > 0 ? <RangeTable title="Preferred" ranges={value.ranges} id="accept-preferred" /> : null}
          {value.refused.length > 0 ? <RangeTable title="Refused (q=0)" ranges={value.refused} id="accept-refused" /> : null}

          {/* Keyed by kind so the example offers reset when the header type changes. */}
          <Negotiation key={value.kind} result={value} />
        </div>
      ) : null}
    </div>
  );
}
