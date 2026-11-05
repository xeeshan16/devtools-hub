"use client";

import { ArrowRightLeft, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import {
  convertQueryString,
  DEFAULT_QUERY_STRING_OPTIONS,
  type QueryArrayFormat,
  type QueryStringDirection,
  type QueryStringOptions,
} from "@/lib/tools/query-string";

const DIRECTIONS = [
  { value: "query-to-json", label: "Query → JSON" },
  { value: "json-to-query", label: "JSON → Query" },
] as const satisfies readonly { value: QueryStringDirection; label: string }[];

const ARRAY_FORMATS = [
  { value: "repeat", label: "tag=a&tag=b", title: "Repeated keys — HTML forms, URLSearchParams, Go, Python, Java" },
  { value: "brackets", label: "tag[]=a", title: "Bracket suffix — PHP, Rails, Node qs" },
] as const satisfies readonly { value: QueryArrayFormat; label: string; title: string }[];

const SAMPLES: Record<QueryStringDirection, string> = {
  "query-to-json":
    "https://shop.example.com/search?q=wireless+mouse&tag=sale&tag=new&price[min]=10&price[max]=50&sort=price_asc&utm_source=newsletter#results",
  "json-to-query": `{
  "q": "wireless mouse",
  "tag": ["sale", "new"],
  "price": { "min": 10, "max": 50 },
  "in_stock": true,
  "cursor": null
}`,
};

export function QueryStringJsonTool() {
  const [input, setInput] = useState("");
  const [direction, setDirection] = useState<QueryStringDirection>("query-to-json");
  const [options, setOptions] = useState<QueryStringOptions>(DEFAULT_QUERY_STRING_OPTIONS);

  const result = useMemo(
    () => convertQueryString(input, direction, options),
    [input, direction, options],
  );
  const conversion = result.ok ? result.value : null;

  function set<K extends keyof QueryStringOptions>(key: K, value: QueryStringOptions[K]) {
    setOptions((current) => ({ ...current, [key]: value }));
  }

  function swap() {
    if (conversion?.output) setInput(conversion.output);
    setDirection((d) => (d === "query-to-json" ? "json-to-query" : "query-to-json"));
  }

  const [inputLabel, outputLabel] =
    direction === "query-to-json" ? ["Query string or URL", "JSON"] : ["JSON", "Query string"];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Segmented
          label="Conversion direction"
          options={DIRECTIONS}
          value={direction}
          onChange={setDirection}
        />
        {direction === "query-to-json" ? (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted select-none">
            <input
              type="checkbox"
              checked={options.nested}
              onChange={(e) => set("nested", e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--accent)]"
            />
            Nested keys (user[name], tags[])
          </label>
        ) : (
          <Segmented
            label="Array format"
            options={ARRAY_FORMATS}
            value={options.arrayFormat}
            onChange={(arrayFormat) => set("arrayFormat", arrayFormat)}
          />
        )}
        <Button size="sm" variant="ghost" onClick={swap} className="ml-auto">
          <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden />
          Swap
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InputPanel
          value={input}
          onChange={setInput}
          title={inputLabel}
          placeholder={`Paste ${inputLabel === "JSON" ? "a JSON object" : "a query string or URL"} here…`}
          sample={SAMPLES[direction]}
          minRows={14}
        />
        <OutputPanel
          title={outputLabel}
          value={conversion?.output ?? ""}
          error={result.ok ? null : result.error}
          minRows={14}
        />
      </div>

      {conversion && conversion.warnings.length > 0 ? (
        <section aria-label="Conversion notes" className="rounded-lg border border-border bg-surface p-3">
          <h2 className="mb-2 text-xs font-semibold text-foreground">Notes</h2>
          <ul className="space-y-1.5">
            {conversion.warnings.map((warning, index) => (
              <li key={`${index}-${warning}`} className="flex items-start gap-2 text-xs leading-5 text-muted">
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
