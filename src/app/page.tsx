import { Lock, Zap } from "lucide-react";
import { AdSlot } from "@/components/ads/AdSlot";
import { ToolBrowser } from "@/components/tools/ToolBrowser";
import { site } from "@/lib/site";
import { TOOLS } from "@/lib/tools/registry";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 lg:px-6 lg:py-14">
      <section>
        <h1 className="max-w-2xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {TOOLS.length} developer tools that run entirely in your browser
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          Format JSON, decode a JWT, test a regular expression, explain a cron
          expression. No sign-up, no upload, no waiting on a round trip — every
          tool does its work locally, so whatever you paste stays on your
          machine.
        </p>

        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
          <li className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-accent" aria-hidden />
            Nothing leaves your browser
          </li>
          <li className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-accent" aria-hidden />
            Instant results, no sign-up
          </li>
          <li className="flex items-center gap-1.5">
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px]">
              ⌘K
            </kbd>
            Jump to any tool
          </li>
        </ul>

        <ToolBrowser />
      </section>

      {/* Below the fold, per design doc §4.1 — never above the tool grid. */}
      <AdSlot
        slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME}
        height={280}
        format="horizontal"
        className="mt-12"
      />

      <section className="mt-12 max-w-3xl">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Why {site.name}?
        </h2>
        <div className="mt-3 space-y-3 text-sm leading-7 text-muted">
          <p>
            Most online developer utilities send whatever you paste to a server
            to do the work. For a formatting job that is both slower and riskier
            than it needs to be — API responses, access tokens and config files
            routinely contain credentials you would rather not hand to a
            stranger&rsquo;s backend.
          </p>
          <p>
            Every tool here is implemented in JavaScript that runs in your own
            tab. There is no API behind these pages, no account system and
            nothing to log. That also makes them fast: results update as you
            type, and they keep working when your connection does not.
          </p>
          <p>
            Each tool has its own page with a short explainer, worked examples
            and answers to the questions that actually come up — so you can
            check what a cron field means or why a YAML value turned into a
            boolean without leaving the tool you came for.
          </p>
        </div>
      </section>
    </div>
  );
}
