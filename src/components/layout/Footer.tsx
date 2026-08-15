import Link from "next/link";
import { site } from "@/lib/site";
import { toolPath, toolsByCategory } from "@/lib/tools/registry";

export function Footer() {
  const groups = toolsByCategory();

  return (
    <footer className="mt-16 border-t border-border bg-surface/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 lg:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <p className="text-sm font-semibold text-foreground">{site.name}</p>
            <p className="mt-2 max-w-xs text-xs leading-6 text-muted">
              {site.tagline}. Every tool runs entirely in your browser — nothing
              you paste is uploaded, logged or stored.
            </p>
          </div>

          {groups.map((group) => (
            <div key={group.category}>
              <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
                {group.category}
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {group.tools.map((tool) => (
                  <li key={tool.slug}>
                    <Link
                      href={toolPath(tool.slug)}
                      className="text-xs text-muted hover:text-foreground"
                    >
                      {tool.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. Built by {site.author}.
          </p>
          <nav className="flex items-center gap-4">
            <Link href="/about" className="hover:text-foreground">
              About
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
