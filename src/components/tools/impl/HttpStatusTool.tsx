"use client";

import { Search, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { Panel } from "@/components/tools/Panel";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import {
  STATUS_CLASSES,
  formatStatusLine,
  isHeuristicallyCacheable,
  lookupStatus,
  statusClassOf,
  type StatusClass,
  type StatusCode,
} from "@/lib/tools/http-status";

type ClassFilter = "all" | `${StatusClass}`;

const CLASS_OPTIONS: readonly { value: ClassFilter; label: string; title?: string }[] = [
  { value: "all", label: "All" },
  ...STATUS_CLASSES.map((c) => ({
    value: String(c.class) as ClassFilter,
    label: `${c.class}xx`,
    title: c.label,
  })),
];

const CLASS_COLORS: Record<StatusClass, string> = {
  1: "text-muted",
  2: "text-success",
  3: "text-accent",
  4: "text-foreground",
  5: "text-danger",
};

function StatusRow({ status }: { status: StatusCode }) {
  const cls = statusClassOf(status.code);
  return (
    <li className="flex min-w-0 items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
      <span
        className={cn("font-code w-10 shrink-0 text-base font-semibold tabular-nums", CLASS_COLORS[cls.class])}
        title={cls.label}
      >
        {status.code}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium text-foreground">
          {status.name}
          {status.deprecated ? (
            <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-[10px] font-normal text-muted uppercase">
              Obsolete
            </span>
          ) : null}
        </p>
        {status.aliases.length > 0 ? (
          <p className="text-[11px] text-muted">Also known as {status.aliases.join(", ")}</p>
        ) : null}
        <p className="text-[13px] leading-6 text-muted">{status.description}</p>
        <p className="text-[11px] text-muted">
          {cls.label} · {status.spec}
          {isHeuristicallyCacheable(status.code) ? " · cacheable by default" : ""}
        </p>
      </div>
      <CopyButton value={formatStatusLine(status)} size="icon" label={`Copy ${formatStatusLine(status)}`} />
    </li>
  );
}

export function HttpStatusTool() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ClassFilter>("all");

  const result = useMemo(
    () => lookupStatus(query, filter === "all" ? undefined : (Number(filter) as StatusClass)),
    [query, filter],
  );
  const lookup = result.ok ? result.value : null;
  const count = lookup?.matches.length ?? 0;

  return (
    <div className="space-y-4">
      <Panel
        title="Search"
        actions={
          query ? (
            <Button size="sm" variant="ghost" onClick={() => setQuery("")}>
              Clear
            </Button>
          ) : null
        }
        footer={<span>Type a code (404), a class (5xx) or words (too many, gateway, teapot).</span>}
      >
        <div className="flex items-center gap-2 p-3">
          <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            aria-label="Search status codes"
            aria-invalid={!result.ok}
            aria-describedby={!result.ok ? "http-status-error" : undefined}
            placeholder="404, 5xx, not found, rate limit…"
            className="font-code h-9 w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
          />
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Status class" options={CLASS_OPTIONS} value={filter} onChange={setFilter} />
        <p aria-live="polite" className="text-xs text-muted">
          {lookup && !lookup.unregistered ? `${count} ${count === 1 ? "code" : "codes"}` : null}
        </p>
      </div>

      {!result.ok ? (
        <p id="http-status-error" role="alert" className="text-danger flex items-start gap-2 text-[13px] leading-6">
          <TriangleAlert className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{result.error}</span>
        </p>
      ) : null}

      {lookup?.unregistered ? (
        <div className="rounded-lg border border-border bg-surface px-3 py-2.5 text-[13px] leading-6 text-muted">
          <p className="text-sm font-medium text-foreground">
            {lookup.unregistered.code} is not a registered status code
          </p>
          <p>
            It is in the {lookup.unregistered.class.class}xx {lookup.unregistered.class.label.toLowerCase()} class:{" "}
            {lookup.unregistered.class.description} Clients that do not recognise it treat it as{" "}
            <span className="font-code text-foreground">{formatStatusLine(lookup.unregistered.treatAs)}</span>. Codes
            like this are usually specific to one server, proxy or CDN.
          </p>
        </div>
      ) : null}

      {lookup && lookup.matches.length > 0 ? (
        <ul className="grid gap-2">
          {lookup.matches.map((status) => (
            <StatusRow key={status.code} status={status} />
          ))}
        </ul>
      ) : lookup && !lookup.unregistered ? (
        <p className="text-[13px] text-muted">No status codes match. Try fewer words or another class.</p>
      ) : null}
    </div>
  );
}
