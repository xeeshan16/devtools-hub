"use client";

import { Info, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Segmented } from "@/components/ui/segmented";
import { inspectUnicode, type CharInfo } from "@/lib/tools/unicode";
import { cn } from "@/lib/utils";

// Contains a zero-width space, a no-break space, a combining accent and a ZWJ emoji sequence.
const SAMPLE = "user​id = \"Café\" // 👩‍💻";

type Filter = "all" | "non-ascii" | "hidden";

const FILTERS = [
  { value: "all", label: "All", title: "Every code point" },
  { value: "non-ascii", label: "Non-ASCII", title: "Code points above U+007F" },
  { value: "hidden", label: "Hidden", title: "Invisible characters and unusual spaces" },
] as const satisfies readonly { value: Filter; label: string; title: string }[];

function plural(count: number, word: string): string {
  return `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;
}

function keep(filter: Filter, c: CharInfo): boolean {
  if (filter === "hidden") return c.hidden;
  if (filter === "non-ascii") return c.codePoint > 0x7f;
  return true;
}

/** What to draw in the Char column: nothing visible would render for these. */
function Glyph({ info }: { info: CharInfo }) {
  if (info.hidden || info.kind === "control") {
    return <span className="text-muted" aria-label="invisible">·</span>;
  }
  if (info.kind === "mark") {
    // Dotted circle is the conventional base for showing a combining mark alone.
    return <span>{"◌" + info.char}</span>;
  }
  return <span>{info.char}</span>;
}

function toTsv(rows: CharInfo[]): string {
  const header = ["Offset", "Code point", "Name", "Category", "UTF-8", "UTF-16", "Escape"].join("\t");
  const lines = rows.map((c) =>
    [c.offset, c.label, c.name, c.kind, c.utf8 ?? "", c.utf16, c.escape].join("\t"),
  );
  return [header, ...lines].join("\n");
}

export function UnicodeInspectorTool() {
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const report = useMemo(() => inspectUnicode(input), [input]);
  const rows = useMemo(() => report.chars.filter((c) => keep(filter, c)), [report, filter]);
  const { summary } = report;

  return (
    <div className="space-y-3">
      <InputPanel
        value={input}
        onChange={setInput}
        title="Text"
        placeholder="Paste text with a character you can't see, a string that won't match, or an emoji you want to take apart…"
        sample={SAMPLE}
        minRows={5}
        footer={
          input ? (
            <span className="tabular-nums">
              {plural(summary.graphemes, "character")} · {plural(summary.codePoints, "code point")} ·{" "}
              {plural(summary.utf16Units, "UTF-16 unit")} · {plural(summary.utf8Bytes, "UTF-8 byte")}
            </span>
          ) : null
        }
      />

      {input && summary.hidden > 0 ? (
        <p role="status" className="text-danger flex items-start gap-2 text-[13px] leading-6">
          <TriangleAlert className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Found {plural(summary.hidden, "hidden character")}: invisible characters or spaces
            other than U+0020. Pick Hidden to list just those.
          </span>
        </p>
      ) : null}

      {summary.loneSurrogates > 0 ? (
        <p className="flex items-start gap-2 text-xs leading-5 text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {plural(summary.loneSurrogates, "lone surrogate")}: this is not valid UTF-16, and
            encoders such as TextEncoder replace each one with U+FFFD.
          </span>
        </p>
      ) : null}

      <Segmented label="Show" options={FILTERS} value={filter} onChange={setFilter} />

      <OutputPanel
        title="Code points"
        value={rows.length > 0 ? toTsv(rows) : ""}
        footer={
          input ? (
            <span className="tabular-nums">
              Showing {rows.length.toLocaleString()} of {plural(summary.codePoints, "code point")}
              {report.truncated
                ? ` · first ${report.chars.length.toLocaleString()} inspected, counts cover the whole text`
                : ""}
              {summary.nonAscii > 0 ? ` · ${summary.nonAscii.toLocaleString()} non-ASCII` : ""}
            </span>
          ) : null
        }
      >
        {rows.length > 0 ? (
          <table className="w-full text-left text-[12px]">
            <caption className="sr-only">Code points in the text, in order</caption>
            <thead className="text-muted">
              <tr className="border-b border-border">
                <th scope="col" className="px-3 py-2 font-medium">Char</th>
                <th scope="col" className="px-3 py-2 font-medium">Code point</th>
                <th scope="col" className="px-3 py-2 font-medium">Name / category</th>
                <th scope="col" className="px-3 py-2 font-medium">UTF-8</th>
                <th scope="col" className="px-3 py-2 font-medium">UTF-16</th>
                <th scope="col" className="px-3 py-2 font-medium">Escape</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Offset</th>
              </tr>
            </thead>
            <tbody className="font-code">
              {rows.map((c, i) => (
                <tr
                  key={c.offset}
                  className={cn(
                    "border-border",
                    // A rule between grapheme clusters shows which code points render as one character.
                    i > 0 && rows[i - 1].grapheme !== c.grapheme ? "border-t" : "",
                    c.hidden ? "bg-accent-soft" : "",
                  )}
                >
                  <td className="px-3 py-1.5 text-base leading-5 text-foreground">
                    <Glyph info={c} />
                  </td>
                  <td className="px-3 py-1.5 text-foreground">{c.label}</td>
                  <td className="px-3 py-1.5">
                    {c.name ? <span className="text-foreground">{c.name}</span> : null}
                    <span className={cn("text-muted", c.name ? "ml-2" : "")}>{c.kind}</span>
                    {c.hidden ? <span className="sr-only"> (hidden)</span> : null}
                  </td>
                  <td className="px-3 py-1.5 text-muted">{c.utf8 ?? "invalid"}</td>
                  <td className="px-3 py-1.5 text-muted">{c.utf16}</td>
                  <td className="px-3 py-1.5 text-accent">{c.escape}</td>
                  <td className="px-3 py-1.5 text-right text-muted tabular-nums">{c.offset}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-3 text-xs leading-6 text-muted">
            {input
              ? filter === "hidden"
                ? "No hidden characters: every space is U+0020 and nothing invisible is in the text."
                : "No characters above U+007F: this text is plain ASCII."
              : "Each code point is listed here with its name, category, UTF-8 and UTF-16 encoding and an escape you can paste into code. Copy gives you the rows as tab-separated text."}
          </p>
        )}
      </OutputPanel>
    </div>
  );
}
