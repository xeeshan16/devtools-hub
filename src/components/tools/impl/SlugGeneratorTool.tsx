"use client";

import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Segmented } from "@/components/ui/segmented";
import {
  DEFAULT_SLUG_OPTIONS,
  slugifyLines,
  type SlugOptions,
  type SlugSeparator,
} from "@/lib/tools/slug";

const SAMPLE = `How to Deploy Next.js on Vercel
Crème Brûlée: A Beginner's Guide
Straße & Café — Berlin Travel Notes`;

const SEPARATORS = [
  { value: "-", label: "Hyphen", title: "my-blog-post — the usual choice for URLs" },
  { value: "_", label: "Underscore", title: "my_blog_post" },
  { value: ".", label: "Dot", title: "my.blog.post" },
] as const satisfies readonly { value: SlugSeparator; label: string; title: string }[];

const MAX_LENGTH_LIMIT = 500;

export function SlugGeneratorTool() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<SlugOptions>(DEFAULT_SLUG_OPTIONS);

  const result = useMemo(() => slugifyLines(input, options), [input, options]);

  function set<K extends keyof SlugOptions>(key: K, value: SlugOptions[K]) {
    setOptions((current) => ({ ...current, [key]: value }));
  }

  function setMaxLength(raw: string) {
    const parsed = Math.trunc(Number(raw));
    const value = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), MAX_LENGTH_LIMIT) : 0;
    set("maxLength", value);
  }

  const notes: string[] = [];
  if (result.dropped.length > 0) {
    notes.push(
      `Removed characters with no ASCII equivalent: ${result.dropped.slice(0, 20).join(" ")}${
        result.dropped.length > 20 ? " …" : ""
      }`,
    );
  }
  if (result.truncatedLines > 0) {
    notes.push(
      `${result.truncatedLines.toLocaleString()} ${
        result.truncatedLines === 1 ? "slug was" : "slugs were"
      } shortened to ${options.maxLength} characters at a word boundary.`,
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Segmented
          label="Separator"
          options={SEPARATORS}
          value={options.separator}
          onChange={(separator) => set("separator", separator)}
        />
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted select-none">
          <input
            type="checkbox"
            checked={options.lowercase}
            onChange={(e) => set("lowercase", e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--accent)]"
          />
          Lowercase
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          Max length
          <input
            type="number"
            min={0}
            max={MAX_LENGTH_LIMIT}
            value={options.maxLength || ""}
            placeholder="None"
            onChange={(e) => setMaxLength(e.target.value)}
            aria-describedby="slug-max-length-hint"
            className="h-6 w-16 rounded border border-border bg-background px-1.5 text-[11px] tabular-nums text-foreground focus:outline-none"
          />
          <span id="slug-max-length-hint" className="sr-only">
            Leave empty for no limit. Slugs are cut at a word boundary.
          </span>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InputPanel
          value={input}
          onChange={setInput}
          title="Titles"
          placeholder="Paste a title, or several — one per line…"
          sample={SAMPLE}
          spellCheck
        />

        <OutputPanel
          title="Slugs"
          value={result.output}
          footer={
            notes.length > 0 ? (
              <ul className="space-y-1" aria-live="polite">
                {notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null
          }
        />
      </div>
    </div>
  );
}
