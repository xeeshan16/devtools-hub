"use client";

import { useId, useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { InputPanel } from "@/components/tools/InputPanel";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { evaluateJsonPointer, listPointers } from "@/lib/tools/json-pointer";

const SAMPLE = `{
  "store": {
    "name": "Corner Books",
    "books": [
      { "title": "Sayings of the Century", "price": 8.95, "tags": ["classic"] },
      { "title": "Moby Dick", "price": 8.99, "isbn": "0-553-21311-3" }
    ],
    "a/b": "slash in a key",
    "m~n": "tilde in a key"
  }
}`;

const SAMPLE_POINTER = "/store/books/1/title";

/** Rendering thousands of rows makes typing sluggish; the list is a navigation aid, not an export. */
const LIST_LIMIT = 500;

export function JsonPointerTool() {
  const pointerId = useId();
  const [input, setInput] = useState("");
  const [pointer, setPointer] = useState("");

  const result = useMemo(() => evaluateJsonPointer(input, pointer), [input, pointer]);
  const match = result.ok ? result.value : null;

  const listing = useMemo(() => {
    if (!input.trim()) return null;
    try {
      return listPointers(JSON.parse(input), LIST_LIMIT);
    } catch {
      return null;
    }
  }, [input]);

  /** The example is more useful with a pointer already pointing into it. */
  function changeInput(value: string) {
    setInput(value);
    if (value === SAMPLE && !pointer) setPointer(SAMPLE_POINTER);
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={pointerId} className="block text-xs font-semibold tracking-wide text-muted uppercase">
          JSON Pointer
        </label>
        <input
          id={pointerId}
          type="text"
          value={pointer}
          onChange={(event) => setPointer(event.target.value)}
          placeholder="/store/books/0/title  (empty = whole document, #/… fragments work too)"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          className="font-code mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] leading-6 text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
        />
        {match ? (
          <dl className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 text-xs leading-5">
            <dt className="text-muted">Pointer</dt>
            <dd className="font-code break-all text-foreground">{match.pointer || '"" (whole document)'}</dd>
            <dd>{match.pointer ? <CopyButton value={match.pointer} size="icon" label="Copy pointer" /> : null}</dd>
            <dt className="text-muted">URI fragment</dt>
            <dd className="font-code break-all text-foreground">{match.fragment}</dd>
            <dd>
              <CopyButton value={match.fragment} size="icon" label="Copy URI fragment" />
            </dd>
            <dt className="text-muted">Tokens</dt>
            <dd className="font-code col-span-2 break-all text-foreground">{JSON.stringify(match.tokens)}</dd>
          </dl>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InputPanel
          value={input}
          onChange={changeInput}
          title="JSON document"
          placeholder="Paste a JSON document…"
          sample={SAMPLE}
        />
        <OutputPanel
          value={match?.json ?? ""}
          error={result.ok ? null : result.error}
          title={match ? `Value (${match.type})` : "Value"}
          placeholder="The value the pointer refers to appears here."
        />
      </div>

      {listing ? (
        <section aria-labelledby="json-pointer-list" className="rounded-lg border border-border bg-surface p-3">
          <h2 id="json-pointer-list" className="text-xs font-semibold tracking-wide text-muted uppercase">
            Every pointer in this document ({listing.truncated ? `first ${listing.entries.length.toLocaleString()}` : listing.entries.length.toLocaleString()})
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted">Select a pointer to evaluate it.</p>
          <ul className="mt-2 max-h-80 space-y-0.5 overflow-auto">
            {listing.entries.map((entry) => (
              <li key={entry.pointer}>
                <button
                  type="button"
                  onClick={() => setPointer(entry.pointer)}
                  aria-current={match?.pointer === entry.pointer ? "true" : undefined}
                  className="flex w-full min-w-0 items-baseline gap-3 rounded px-2 py-0.5 text-left text-xs leading-5 hover:bg-border/40 focus-visible:outline-2 focus-visible:outline-accent aria-[current=true]:bg-border/60"
                >
                  <span className="font-code min-w-0 flex-1 break-all text-foreground">{entry.pointer || '""'}</span>
                  <span className="font-code shrink-0 truncate text-muted max-w-[45%]">{entry.preview}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
