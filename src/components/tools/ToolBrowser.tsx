"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ToolCard } from "@/components/tools/ToolCard";
import { TOOLS, TOOL_CATEGORIES, type Tool } from "@/lib/tools/registry";

/** Matches on name, tagline and keywords so "guid" finds the UUID generator. */
function matches(tool: Tool, query: string): boolean {
  const haystack = [tool.name, tool.tagline, tool.category, ...tool.keywords]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export function ToolBrowser() {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const filtered = query ? TOOLS.filter((tool) => matches(tool, query)) : TOOLS;
    return TOOL_CATEGORIES.map((category) => ({
      category,
      tools: filtered.filter((tool) => tool.category === category),
    })).filter((group) => group.tools.length > 0);
  }, [query]);

  return (
    <>
      <div className="relative mt-6 max-w-xl">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          aria-label="Search tools"
          placeholder="Search tools — try json, base64, cron…"
          className="h-11 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>

      <div className="mt-8 space-y-8">
        {groups.map((group) => (
          <section key={group.category}>
            <h2 className="text-[11px] font-semibold tracking-wider text-muted uppercase">
              {group.category}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.tools.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          </section>
        ))}

        {groups.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted">
            No tools match “{query}”. More are on the way — try clearing the
            search.
          </p>
        ) : null}
      </div>
    </>
  );
}
