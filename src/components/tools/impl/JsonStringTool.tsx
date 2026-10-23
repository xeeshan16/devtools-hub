"use client";

import { ArrowRightLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { escapeJsonString, unescapeJsonString } from "@/lib/tools/json-string";

type Direction = "escape" | "unescape";

const DIRECTIONS = [
  { value: "escape", label: "Escape" },
  { value: "unescape", label: "Unescape" },
] as const satisfies readonly { value: Direction; label: string }[];

const SAMPLES: Record<Direction, string> = {
  escape: `{"event": "login", "path": "C:\\Users\\dev"}
Café — "quoted" text`,
  unescape: `{\\"event\\":\\"login\\",\\"user\\":\\"zo\\u00eb\\",\\"note\\":\\"line 1\\nline 2\\"}`,
};

type ToggleKey = "quotes" | "asciiOnly";

const TOGGLES: { key: ToggleKey; label: string }[] = [
  { key: "quotes", label: "Wrap in quotes" },
  { key: "asciiOnly", label: "Escape non-ASCII as \\uXXXX" },
];

export function JsonStringTool() {
  const [input, setInput] = useState("");
  const [direction, setDirection] = useState<Direction>("escape");
  const [options, setOptions] = useState<Record<ToggleKey, boolean>>({
    quotes: false,
    asciiOnly: false,
  });

  const { output, error } = useMemo(() => {
    if (direction === "escape") {
      return { output: input ? escapeJsonString(input, options) : "", error: null };
    }
    const decoded = unescapeJsonString(input);
    return decoded.ok
      ? { output: decoded.value, error: null }
      : { output: "", error: decoded.error };
  }, [input, direction, options]);

  /** Feeds the output back in and flips direction — the common round-trip check. */
  function swap() {
    if (!error && output) setInput(output);
    setDirection((d) => (d === "escape" ? "unescape" : "escape"));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Direction" options={DIRECTIONS} value={direction} onChange={setDirection} />

        {direction === "escape"
          ? TOGGLES.map((toggle) => (
              <label
                key={toggle.key}
                className="flex cursor-pointer items-center gap-2 text-xs text-muted select-none"
              >
                <input
                  type="checkbox"
                  checked={options[toggle.key]}
                  onChange={(e) =>
                    setOptions((current) => ({ ...current, [toggle.key]: e.target.checked }))
                  }
                  className="h-3.5 w-3.5 accent-[var(--accent)]"
                />
                {toggle.label}
              </label>
            ))
          : null}

        <Button size="sm" variant="ghost" onClick={swap} className="ml-auto">
          <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden />
          Swap
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InputPanel
          value={input}
          onChange={setInput}
          title={direction === "escape" ? "Text" : "Escaped JSON string"}
          placeholder={
            direction === "escape"
              ? "Type or paste the text to put inside a JSON string…"
              : 'Paste an escaped string, with or without its quotes: {\\"id\\":1}'
          }
          sample={SAMPLES[direction]}
          spellCheck={false}
        />

        <OutputPanel
          title={direction === "escape" ? "Escaped" : "Unescaped text"}
          value={output}
          error={error}
        />
      </div>
    </div>
  );
}
