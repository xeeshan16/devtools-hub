import Link from "next/link";
import { ToolCard } from "@/components/tools/ToolCard";
import { TOOLS } from "@/lib/tools/registry";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 lg:px-6">
      <p className="font-code text-xs tracking-wider text-accent uppercase">
        404
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        That page doesn&rsquo;t exist
      </h1>
      <p className="mt-3 text-sm leading-7 text-muted">
        The tool you were looking for may have moved, or it may not be built
        yet. <Link href="/" className="text-accent underline underline-offset-2">
          Browse all tools
        </Link>{" "}
        or press ⌘K to search.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {TOOLS.filter((tool) => tool.phase === 1).map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
      </div>
    </div>
  );
}
