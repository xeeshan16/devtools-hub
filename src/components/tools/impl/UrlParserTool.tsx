"use client";

import { Info, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { InputPanel } from "@/components/tools/InputPanel";
import { parseUrl, type ParsedUrl } from "@/lib/tools/url-parser";

const SAMPLE = "https://alice@api.example.com:8443/v1/search?q=caf%C3%A9+au+lait&tag=a&tag=b#results";

/** The parts shown as cards, in the order they appear in a URL. */
function partsOf(url: ParsedUrl | null): { name: string; value: string }[] {
  if (!url) {
    return ["Scheme", "Host", "Port", "Path", "Query", "Fragment"].map((name) => ({ name, value: "" }));
  }

  const parts = [
    { name: "Scheme", value: url.scheme },
    { name: "Username", value: url.username },
    { name: "Password", value: url.password },
    { name: "Host", value: url.hostname },
    {
      name: "Port",
      value: url.port || (url.effectivePort ? `${url.effectivePort} (default)` : ""),
    },
    { name: "Origin", value: url.origin ?? "" },
    { name: "Path", value: url.pathname },
    { name: "Query", value: url.query },
    { name: "Fragment", value: url.fragment },
  ];
  // Credentials and an origin only appear when the URL has them.
  return parts.filter(
    (part) => part.value || !["Username", "Password", "Origin"].includes(part.name),
  );
}

export function UrlParserTool() {
  const [input, setInput] = useState("");

  const result = useMemo(() => parseUrl(input), [input]);
  const url = result.ok ? result.value : null;

  return (
    <div className="space-y-4">
      <InputPanel
        value={input}
        onChange={setInput}
        title="URL"
        placeholder="Paste a URL to break it into parts, e.g. https://example.com/path?q=1#top…"
        sample={SAMPLE}
        minRows={2}
      />

      {!result.ok ? (
        <p role="alert" className="text-danger flex items-start gap-2 text-[13px] leading-6">
          <TriangleAlert className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-code break-words">{result.error}</span>
        </p>
      ) : null}

      {url?.assumedScheme ? (
        <p className="flex items-start gap-2 text-xs leading-5 text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            No scheme was given, so this was read as <span className="font-code">https://</span>.
          </span>
        </p>
      ) : null}

      {url ? (
        <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">Normalized URL</p>
            <p className="font-code mt-1 text-[13px] break-all text-muted">{url.href}</p>
          </div>
          <CopyButton value={url.href} size="icon" label="Copy normalized URL" />
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {partsOf(url).map(({ name, value }) => (
          <div
            key={name}
            className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">{name}</p>
              <p className="font-code mt-1 text-[13px] break-all text-muted">{value || "—"}</p>
            </div>
            <CopyButton
              value={value}
              size="icon"
              label={`Copy ${name.toLowerCase()}`}
              disabled={!value}
            />
          </div>
        ))}
      </div>

      {url && url.pathSegments.length > 0 ? (
        <section aria-labelledby="url-path-segments">
          <h2 id="url-path-segments" className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
            Path segments
          </h2>
          <ol className="flex flex-wrap gap-2">
            {url.pathSegments.map((segment, index) => (
              <li
                key={`${index}-${segment}`}
                className="font-code rounded-md border border-border bg-surface px-2 py-1 text-[13px] break-all text-foreground"
              >
                {segment}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {url && url.params.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface p-3">
          <table className="w-full text-left text-xs">
            <caption className="pb-2 text-left font-semibold tracking-wide text-muted uppercase">
              Query parameters ({url.params.length})
            </caption>
            <thead>
              <tr className="text-muted">
                <th scope="col" className="pb-2 font-semibold">
                  Key
                </th>
                <th scope="col" className="pb-2 font-semibold">
                  Decoded value
                </th>
                <th scope="col" className="pb-2">
                  <span className="sr-only">Copy</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {url.params.map(({ key, value }, index) => (
                <tr key={`${index}-${key}`} className="border-t border-border">
                  <th scope="row" className="font-code py-2 pr-3 align-top font-normal break-all text-foreground">
                    {key || <span className="text-muted">(empty)</span>}
                  </th>
                  <td className="font-code py-2 pr-3 align-top break-all text-muted">
                    {value || "—"}
                  </td>
                  <td className="py-1 text-right align-top">
                    <CopyButton
                      value={value}
                      size="icon"
                      label={`Copy value of ${key || "empty key"}`}
                      disabled={!value}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
