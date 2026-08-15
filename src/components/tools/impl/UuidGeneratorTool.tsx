"use client";

import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Panel } from "@/components/tools/Panel";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import {
  generateUuids,
  inspectUuid,
  type UuidVersion,
} from "@/lib/tools/uuid";
import { useClientValue } from "@/lib/use-client-value";

const VERSIONS = [
  { value: "v4", label: "v4", title: "Random (RFC 9562)" },
  { value: "v7", label: "v7", title: "Time-ordered (RFC 9562)" },
  { value: "nil", label: "Nil", title: "All-zero UUID" },
] as const satisfies readonly { value: UuidVersion; label: string; title: string }[];

export function UuidGeneratorTool() {
  const [version, setVersion] = useState<UuidVersion>("v4");
  const [count, setCount] = useState(5);
  const [seed, setSeed] = useState(0);
  const [inspectInput, setInspectInput] = useState("");

  // `crypto.getRandomValues` would yield different values on the server and on
  // the client, so the first batch waits until after hydration.
  const ready = useClientValue(() => true, false);

  const result = useMemo(() => {
    // `seed` carries no data — bumping it is what makes Regenerate produce a
    // fresh batch for otherwise unchanged options.
    void seed;
    return ready
      ? generateUuids(version, count)
      : ({ ok: true, value: [] } as const);
  }, [ready, version, count, seed]);

  const uuids = result.ok ? result.value : [];
  const error = result.ok ? null : result.error;

  const inspection = inspectInput.trim() ? inspectUuid(inspectInput) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <OutputPanel
        title="Generated UUIDs"
        value={uuids.join("\n")}
        error={error}
        actions={
          <>
            <Segmented
              label="UUID version"
              options={VERSIONS}
              value={version}
              onChange={setVersion}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSeed((value) => value + 1)}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Regenerate
            </Button>
          </>
        }
        footer={
          <>
            <label className="flex items-center gap-1.5">
              Count
              <input
                type="number"
                min={1}
                max={1000}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="h-6 w-16 rounded border border-border bg-background px-1.5 text-[11px] tabular-nums text-foreground focus:outline-none"
              />
            </label>
            <span className="tabular-nums">{uuids.length} generated</span>
          </>
        }
      >
        <ol className="divide-y divide-border">
          {uuids.map((uuid, index) => (
            <li
              key={`${uuid}-${index}`}
              className="flex items-center gap-2 px-3 py-1.5"
            >
              <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-muted">
                {index + 1}
              </span>
              <code className="font-code flex-1 truncate text-[13px] text-foreground">
                {uuid}
              </code>
              <CopyButton value={uuid} size="icon" label="Copy this UUID" />
            </li>
          ))}
        </ol>
      </OutputPanel>

      <Panel
        title="Inspect a UUID"
        footer={
          <span>Reads the version and variant bits — no network request.</span>
        }
      >
        <div className="space-y-3 p-3">
          <input
            value={inspectInput}
            onChange={(e) => setInspectInput(e.target.value)}
            placeholder="Paste any UUID, e.g. 018f0a1b-2c3d-7e4f-8a9b-0c1d2e3f4a5b"
            aria-label="UUID to inspect"
            spellCheck={false}
            className="font-code h-9 w-full rounded-md border border-border bg-background px-2.5 text-[13px] text-foreground placeholder:text-muted focus:outline-none"
          />

          {inspection === null ? (
            <p className="text-xs leading-6 text-muted">
              Paste a UUID above to see which version generated it, which
              variant it uses, and — for v7 — the timestamp embedded in it.
            </p>
          ) : inspection.ok ? (
            <dl className="divide-y divide-border overflow-hidden rounded-md border border-border">
              <Row label="Version">
                {inspection.value.version === "nil"
                  ? "Nil UUID"
                  : `v${inspection.value.version}`}
              </Row>
              <Row label="Variant">{inspection.value.variant}</Row>
              {inspection.value.timestamp ? (
                <Row label="Created at">
                  {inspection.value.timestamp.toISOString()}
                </Row>
              ) : null}
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
      <dd className="font-code text-[13px] text-foreground">{children}</dd>
    </div>
  );
}
