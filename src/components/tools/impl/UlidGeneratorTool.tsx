"use client";

import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Panel } from "@/components/tools/Panel";
import { Button } from "@/components/ui/button";
import { generateUlids, inspectUlid, MAX_ULID_BATCH } from "@/lib/tools/ulid";
import { useClientValue } from "@/lib/use-client-value";

export function UlidGeneratorTool() {
  const [countText, setCountText] = useState("5");
  const [monotonic, setMonotonic] = useState(true);
  const [seed, setSeed] = useState(0);
  const [inspectInput, setInspectInput] = useState("");

  // Both the clock and `crypto.getRandomValues` differ between the server and
  // the client, so the first batch waits until after hydration.
  const ready = useClientValue(() => true, false);

  const count = countText.trim() === "" ? 0 : Number(countText);

  const result = useMemo(() => {
    // `seed` carries no data — bumping it makes Regenerate produce a fresh
    // batch for otherwise unchanged options.
    void seed;
    return ready
      ? generateUlids(count, { monotonic })
      : ({ ok: true, value: [] } as const);
  }, [ready, count, monotonic, seed]);

  const ulids = result.ok ? result.value : [];
  const error = result.ok ? null : result.error;

  const inspection = inspectInput.trim() ? inspectUlid(inspectInput) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <OutputPanel
        title="Generated ULIDs"
        value={ulids.join("\n")}
        error={error}
        actions={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSeed((value) => value + 1)}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Regenerate
          </Button>
        }
        footer={
          <>
            <label className="flex items-center gap-1.5">
              Count
              <input
                type="number"
                min={1}
                max={MAX_ULID_BATCH}
                step={1}
                inputMode="numeric"
                value={countText}
                onChange={(e) => setCountText(e.target.value)}
                aria-invalid={!result.ok}
                className="h-6 w-16 rounded border border-border bg-background px-1.5 text-[11px] tabular-nums text-foreground focus:outline-none"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 select-none">
              <input
                type="checkbox"
                checked={monotonic}
                onChange={(e) => setMonotonic(e.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--accent)]"
              />
              Monotonic
            </label>
            <span className="tabular-nums">{ulids.length} generated</span>
          </>
        }
      >
        <ol className="divide-y divide-border">
          {ulids.map((ulid, index) => (
            <li
              key={`${ulid}-${index}`}
              className="flex items-center gap-2 px-3 py-1.5"
            >
              <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-muted">
                {index + 1}
              </span>
              <code className="font-code flex-1 truncate text-[13px] text-foreground">
                {ulid}
              </code>
              <CopyButton value={ulid} size="icon" label="Copy this ULID" />
            </li>
          ))}
        </ol>
      </OutputPanel>

      <Panel
        title="Inspect a ULID"
        footer={<span>Decoded in your browser — no network request.</span>}
      >
        <div className="space-y-3 p-3">
          <input
            value={inspectInput}
            onChange={(e) => setInspectInput(e.target.value)}
            placeholder="Paste any ULID, e.g. 01ARYZ6S41TSV4RRFFQ69G5FAV"
            aria-label="ULID to inspect"
            spellCheck={false}
            className="font-code h-9 w-full rounded-md border border-border bg-background px-2.5 text-[13px] text-foreground placeholder:text-muted focus:outline-none"
          />

          {inspection === null ? (
            <p className="text-xs leading-6 text-muted">
              Paste a ULID above to read the moment it was created, its random
              component, and the same 128 bits written as a UUID.
            </p>
          ) : inspection.ok ? (
            <dl className="divide-y divide-border overflow-hidden rounded-md border border-border">
              <Row label="Created at">
                {inspection.value.timestamp.toISOString()}
              </Row>
              <Row label="Unix ms">{inspection.value.timestamp.getTime()}</Row>
              <Row label="Random">{inspection.value.randomHex}</Row>
              <Row label="As UUID">
                <span className="flex items-center gap-2">
                  {inspection.value.uuid}
                  <CopyButton
                    value={inspection.value.uuid}
                    size="icon"
                    label="Copy the UUID form"
                  />
                </span>
              </Row>
            </dl>
          ) : (
            <p role="alert" className="text-danger text-xs leading-6">
              {inspection.error}
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 px-3 py-2">
      <dt className="w-24 shrink-0 text-[11px] tracking-wide text-muted uppercase">
        {label}
      </dt>
      <dd className="font-code min-w-0 break-all text-[13px] text-foreground">
        {children}
      </dd>
    </div>
  );
}
