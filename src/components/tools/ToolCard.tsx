import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { toolPath, type Tool } from "@/lib/tools/registry";

export function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;

  return (
    <Link
      href={toolPath(tool.slug)}
      className="group flex items-start gap-3 rounded-lg border border-border bg-surface p-3.5 transition-colors hover:border-accent hover:bg-surface-2"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-fg">
        <Icon className="h-4 w-4" aria-hidden />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
          {tool.name}
          <ArrowRight
            className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
            aria-hidden
          />
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-muted">
          {tool.tagline}
        </span>
      </span>
    </Link>
  );
}
