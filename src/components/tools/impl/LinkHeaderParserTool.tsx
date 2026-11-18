"use client";

import { TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { parseLinkHeader, type LinkValue, type PageLink, type Pagination } from "@/lib/tools/link-header";

const SAMPLE =
  'Link: <https://api.example.com/items?page=1>; rel="first", <https://api.example.com/items?page=2>; rel="prev", <https://api.example.com/items?page=4>; rel="next", <https://api.example.com/items?page=12>; rel="last"';

const PAGE_LABELS: [keyof Pagination, string][] = [
  ["first", "First"],
  ["prev", "Previous"],
  ["next", "Next"],
  ["last", "Last"],
];

function PaginationCard({ pagination }: { pagination: Pagination }) {
  return (
    <section aria-labelledby="link-pagination" className="rounded-lg border border-border bg-surface p-3">
      <h2 id="link-pagination" className="text-xs font-semibold tracking-wide text-muted uppercase">
        Pagination
      </h2>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs leading-5">
        {PAGE_LABELS.map(([key, label]) => {
          const link: PageLink | null = pagination[key];
          return (
            <div key={key} className="contents">
              <dt className="text-muted">{label}</dt>
              <dd className={link ? "font-code break-all text-foreground" : "text-muted"}>
                {link ? (
                  <>
                    {link.page !== null ? <span className="font-semibold">page {link.page} · </span> : null}
                    {link.url}
                  </>
                ) : (
                  "none"
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function LinkCard({ link, index }: { link: LinkValue; index: number }) {
  const headingId = `link-${index}`;
  return (
    <section aria-labelledby={headingId} className="rounded-lg border border-border bg-surface p-3">
      <h2 id={headingId} className="font-code text-[13px] leading-6 break-all text-foreground">
        <span className="sr-only">Link {index + 1}: </span>
        {link.target === "" ? "(empty target)" : link.target}
      </h2>
      {!link.absolute && link.target !== "" ? (
        <p className="text-xs leading-5 text-muted">Relative reference, resolved against the URL of the response.</p>
      ) : null}

      {link.relations.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {link.relations.map((relation, relationIndex) => (
            <li key={`${relationIndex}-${relation.name}`} className="text-xs leading-5">
              <span className="font-code font-semibold break-all text-foreground">rel={relation.name}</span>
              <span className={relation.known ? "text-foreground" : "text-muted"}> — {relation.description}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {link.params.length > 0 ? (
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
              {link.params.map((param, paramIndex) => (
                <tr key={`${paramIndex}-${param.name}`} className="border-t border-border">
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
      ) : null}
    </section>
  );
}

export function LinkHeaderParserTool() {
  const [input, setInput] = useState("");

  const result = useMemo(() => parseLinkHeader(input), [input]);
  const value = result.ok ? result.value : null;

  return (
    <div className="space-y-4">
      <InputPanel
        value={input}
        onChange={setInput}
        title="Link header"
        placeholder='Paste a Link header, e.g. <https://api.example.com/items?page=2>; rel="next"…'
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
        <div className="space-y-3">
          {value.warnings.length > 0 ? (
            <section aria-labelledby="link-warnings" className="rounded-lg border border-border bg-surface p-3">
              <h2 id="link-warnings" className="text-xs font-semibold tracking-wide text-muted uppercase">
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

          {value.pagination ? <PaginationCard pagination={value.pagination} /> : null}

          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Links ({value.links.length})</p>
          {value.links.map((link, index) => (
            <LinkCard key={`${index}-${link.target}`} link={link} index={index} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
