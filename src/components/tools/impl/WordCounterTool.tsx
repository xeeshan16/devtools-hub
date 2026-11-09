"use client";

import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { Panel } from "@/components/tools/Panel";
import {
  formatDuration,
  READING_WPM,
  SPEAKING_WPM,
  textStats,
  type TextStats,
} from "@/lib/tools/text-stats";

const SAMPLE = `DevTools Hub is a collection of developer utilities that run entirely in your browser. Nothing you paste is uploaded, logged or stored.

Paste an essay, a README or a product description here to see its word count, character count and how long it takes to read. Emoji such as 👍🏽 count as one character, even though JavaScript says their length is four.`;

type Stat = { label: string; value: (stats: TextStats) => string; hint?: string };

const PRIMARY: Stat[] = [
  { label: "Words", value: (s) => s.words.toLocaleString() },
  { label: "Characters", value: (s) => s.characters.toLocaleString() },
];

const DETAILS: Stat[] = [
  { label: "Characters without spaces", value: (s) => s.charactersNoSpaces.toLocaleString() },
  { label: "Sentences", value: (s) => s.sentences.toLocaleString() },
  { label: "Paragraphs", value: (s) => s.paragraphs.toLocaleString() },
  { label: "Lines", value: (s) => s.lines.toLocaleString() },
  {
    label: "Reading time",
    value: (s) => formatDuration(s.readingSeconds),
    hint: `At ${READING_WPM} words per minute`,
  },
  {
    label: "Speaking time",
    value: (s) => formatDuration(s.speakingSeconds),
    hint: `At ${SPEAKING_WPM} words per minute`,
  },
  {
    label: "UTF-8 bytes",
    value: (s) => s.bytes.toLocaleString(),
    hint: "Size when saved or sent over the network",
  },
  {
    label: "UTF-16 length",
    value: (s) => s.codeUnits.toLocaleString(),
    hint: "JavaScript .length and HTML maxlength",
  },
];

export function WordCounterTool() {
  const [text, setText] = useState("");
  const stats = useMemo(() => textStats(text), [text]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <InputPanel
        value={text}
        onChange={setText}
        title="Text"
        placeholder="Type or paste text to count its words and characters…"
        sample={SAMPLE}
        spellCheck
        footer={
          <span className="tabular-nums">
            {stats.words.toLocaleString()} words · {stats.characters.toLocaleString()} characters
          </span>
        }
      />

      <Panel title="Statistics">
        <div className="space-y-3 p-3">
          <dl className="grid grid-cols-2 gap-2">
            {PRIMARY.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-border bg-surface-2 px-3 py-2">
                <dt className="text-[11px] text-muted">{stat.label}</dt>
                <dd className="font-code text-2xl font-semibold text-foreground tabular-nums">
                  {stat.value(stats)}
                </dd>
              </div>
            ))}
          </dl>

          <dl className="divide-y divide-border overflow-hidden rounded-md border border-border">
            {DETAILS.map((stat) => (
              <div key={stat.label} className="flex items-baseline justify-between gap-3 px-3 py-2">
                <dt className="min-w-0 text-xs text-muted">
                  {stat.label}
                  {stat.hint ? <span className="block text-[11px] opacity-80">{stat.hint}</span> : null}
                </dt>
                <dd className="font-code text-[13px] whitespace-nowrap text-foreground tabular-nums">
                  {stat.value(stats)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Panel>
    </div>
  );
}
