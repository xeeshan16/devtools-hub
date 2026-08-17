"use client";

import { CircleCheck, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { Panel } from "@/components/tools/Panel";
import { Segmented } from "@/components/ui/segmented";
import { countTokens, countWords, MODELS, type ModelFamily } from "@/lib/tools/token-counter";
import { cn } from "@/lib/utils";

const SAMPLE =
  "DevTools Hub is a collection of developer utilities that run entirely in your browser. Nothing you paste is ever uploaded, logged, or stored on a server.";

const MODEL_OPTIONS = MODELS.map((m) => ({ value: m.id, label: m.label })) as {
  value: ModelFamily;
  label: string;
}[];

type Computed = { key: string; tokens: number; exact: boolean };

export function TokenCounterTool() {
  const [text, setText] = useState("");
  const [model, setModel] = useState<ModelFamily>("gpt-4");
  const [computed, setComputed] = useState<Computed | null>(null);

  const requestKey = `${model}:${text}`;

  useEffect(() => {
    // No synchronous setState here on the empty-text path — `isPending`
    // below is derived at render time instead, the same pattern the JWT
    // Encoder uses to avoid a cascading-render lint error.
    if (!text) return;

    let cancelled = false;
    countTokens(text, model).then((result) => {
      if (cancelled) return;
      setComputed({ key: requestKey, ...result });
    });

    return () => {
      cancelled = true;
    };
  }, [text, model, requestKey]);

  const hasText = text.length > 0;
  const isPending = hasText && computed?.key !== requestKey;
  const words = countWords(text);
  const modelInfo = MODELS.find((m) => m.id === model)!;
  const tokens = hasText && !isPending ? computed!.tokens : null;
  const ratio = tokens !== null && words > 0 ? (tokens / words).toFixed(2) : null;

  return (
    <div className="space-y-4">
      <InputPanel
        value={text}
        onChange={setText}
        title="Text"
        placeholder="Paste the text you want to count tokens for…"
        sample={SAMPLE}
        minRows={10}
        actions={
          <Segmented
            label="Model family"
            options={MODEL_OPTIONS}
            value={model}
            onChange={setModel}
          />
        }
      />

      <Panel title="Token count">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-code text-3xl font-semibold text-foreground tabular-nums">
              {hasText ? (isPending ? "…" : tokens) : "0"}
            </p>
            <p className="mt-1 text-xs text-muted">
              {hasText
                ? `${words.toLocaleString()} words${ratio ? ` · ~${ratio} tokens per word` : ""}`
                : "tokens"}
            </p>
          </div>

          {hasText ? (
            <ExactnessBadge exact={modelInfo.exact} pending={isPending} />
          ) : null}
        </div>
      </Panel>
    </div>
  );
}

function ExactnessBadge({ exact, pending }: { exact: boolean; pending: boolean }) {
  if (pending) {
    return (
      <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-border px-2.5 py-1 text-xs text-muted">
        Counting…
      </span>
    );
  }

  if (exact) {
    return (
      <span className="text-success inline-flex items-center gap-1.5 self-start rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-xs font-medium">
        <CircleCheck className="h-3.5 w-3.5" aria-hidden />
        Exact — real tokenizer
      </span>
    );
  }

  return (
    <span
      title="Neither Anthropic nor Google publishes an offline tokenizer, so this is a ~4-characters-per-token approximation, not a real count."
      className={cn(
        "inline-flex items-center gap-1.5 self-start rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted",
      )}
    >
      <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
      Estimate — no public tokenizer
    </span>
  );
}
