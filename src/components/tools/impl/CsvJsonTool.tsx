"use client";

import { ArrowRightLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import {
  convertCsv,
  type CsvDelimiter,
  type CsvDirection,
} from "@/lib/tools/csv-json";
import { cn } from "@/lib/utils";

const DIRECTIONS = [
  { value: "csv-to-json", label: "CSV → JSON" },
  { value: "json-to-csv", label: "JSON → CSV" },
] as const satisfies readonly { value: CsvDirection; label: string }[];

const DELIMITERS = [
  { value: ",", label: "Comma" },
  { value: ";", label: "Semicolon" },
  { value: "\t", label: "Tab" },
] as const satisfies readonly { value: CsvDelimiter; label: string }[];

const SAMPLES: Record<CsvDirection, string> = {
  "csv-to-json": `id,name,email,plan
1,Ada Lovelace,ada@example.com,pro
2,"Hopper, Grace",grace@example.com,free
3,Alan Turing,alan@example.com,"team ""beta"""`,
  "json-to-csv": `[
  { "id": 1, "name": "Ada Lovelace", "tags": ["admin"] },
  { "id": 2, "name": "Hopper, Grace", "active": false },
  { "id": 3, "name": "Alan Turing", "note": null }
]`,
};

export function CsvJsonTool() {
  const [input, setInput] = useState("");
  const [direction, setDirection] = useState<CsvDirection>("csv-to-json");
  const [delimiter, setDelimiter] = useState<CsvDelimiter>(",");
  const [header, setHeader] = useState(true);

  const result = useMemo(
    () => convertCsv(input, direction, { delimiter, header }),
    [input, direction, delimiter, header],
  );

  function swap() {
    if (result.ok && result.value) setInput(result.value);
    setDirection((d) => (d === "csv-to-json" ? "json-to-csv" : "csv-to-json"));
  }

  const [inputLabel, outputLabel] =
    direction === "csv-to-json" ? ["CSV", "JSON"] : ["JSON", "CSV"];
  const headerApplies = direction === "csv-to-json";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Conversion direction"
          options={DIRECTIONS}
          value={direction}
          onChange={setDirection}
        />
        <Segmented
          label="Delimiter"
          options={DELIMITERS}
          value={delimiter}
          onChange={setDelimiter}
        />
        <label
          className={cn(
            "flex items-center gap-2 text-xs text-muted",
            headerApplies ? "cursor-pointer" : "cursor-not-allowed opacity-50",
          )}
        >
          <input
            type="checkbox"
            checked={header}
            disabled={!headerApplies}
            onChange={(e) => setHeader(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--accent)]"
          />
          First row is a header
        </label>
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
          placeholder={`Paste ${inputLabel} here…`}
          sample={SAMPLES[direction]}
          minRows={18}
        />
        <OutputPanel
          title={outputLabel}
          value={result.ok ? result.value : ""}
          error={result.ok ? null : result.error}
          minRows={18}
        />
      </div>
    </div>
  );
}
