"use client";

import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { useClientValue } from "@/lib/use-client-value";
import {
  DEFAULT_LOREM_OPTIONS,
  generateLorem,
  LOREM_MAX_COUNT,
  type LoremOptions,
  type LoremUnit,
} from "@/lib/tools/lorem-ipsum";

const UNITS = [
  { value: "paragraphs", label: "Paragraphs" },
  { value: "sentences", label: "Sentences" },
  { value: "words", label: "Words" },
] as const satisfies readonly { value: LoremUnit; label: string }[];

export function LoremIpsumTool() {
  const [options, setOptions] = useState<LoremOptions>(DEFAULT_LOREM_OPTIONS);
  const [countText, setCountText] = useState(String(DEFAULT_LOREM_OPTIONS.count));
  const [seed, setSeed] = useState(0);

  // Random text differs between the server render and the client, so the
  // first generation waits until after hydration, like the password generator.
  const ready = useClientValue(() => true, false);

  const result = useMemo(() => {
    void seed;
    return ready ? generateLorem(options) : ({ ok: true, value: "" } as const);
  }, [ready, options, seed]);

  function setCount(raw: string) {
    setCountText(raw);
    setOptions((current) => ({ ...current, count: raw.trim() === "" ? 0 : Number(raw) }));
  }

  const text = result.ok ? result.value : "";
  const wordCount = text ? text.split(/\s+/).length : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-1.5 text-xs text-muted">
          Count
          <input
            type="number"
            min={1}
            max={LOREM_MAX_COUNT[options.unit]}
            step={1}
            inputMode="numeric"
            value={countText}
            onChange={(e) => setCount(e.target.value)}
            aria-invalid={!result.ok}
            className="h-6 w-20 rounded border border-border bg-background px-1.5 text-[11px] tabular-nums text-foreground focus:outline-none"
          />
        </label>
        <Segmented
          label="Unit"
          options={UNITS}
          value={options.unit}
          onChange={(unit) => setOptions((current) => ({ ...current, unit }))}
        />
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted select-none">
          <input
            type="checkbox"
            checked={options.startWithLorem}
            onChange={(e) =>
              setOptions((current) => ({ ...current, startWithLorem: e.target.checked }))
            }
            className="h-3.5 w-3.5 accent-[var(--accent)]"
          />
          Start with &ldquo;Lorem ipsum dolor sit amet&rdquo;
        </label>
      </div>

      <OutputPanel
        title="Placeholder text"
        value={text}
        error={result.ok ? null : result.error}
        placeholder="Generating…"
        actions={
          <Button size="sm" variant="ghost" onClick={() => setSeed((v) => v + 1)}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Regenerate
          </Button>
        }
        footer={
          text ? (
            <span className="tabular-nums">
              {wordCount.toLocaleString()} words · {text.length.toLocaleString()} characters
            </span>
          ) : null
        }
      />
    </div>
  );
}
