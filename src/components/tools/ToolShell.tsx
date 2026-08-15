import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdSlot } from "@/components/ads/AdSlot";
import { ToolStructuredData } from "@/components/seo/ToolStructuredData";
import { ToolCard } from "@/components/tools/ToolCard";
import type { ToolContent } from "@/content/types";
import { relatedTools, type Tool } from "@/lib/tools/registry";

/**
 * The shared tool-page template (design doc §4.2). Every tool page is this
 * component plus a client component for the tool itself, which keeps the SEO
 * surface — headings, explainer, FAQ, structured data — identical everywhere.
 */
export function ToolShell({
  tool,
  content,
  children,
}: {
  tool: Tool;
  content: ToolContent;
  children: ReactNode;
}) {
  const related = relatedTools(tool.slug);
  const Icon = tool.icon;

  return (
    <>
      <ToolStructuredData tool={tool} faq={content.faq} />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 text-xs text-muted"
        >
          <Link href="/" className="hover:text-foreground">
            Tools
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span className="text-foreground">{tool.name}</span>
        </nav>

        <header className="mt-3 flex items-start gap-3">
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-accent">
            <Icon className="h-4.5 w-4.5" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {tool.name}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
              {tool.description}
            </p>
          </div>
        </header>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <div className="min-w-0 flex-1">
            {children}

            {/* Mobile ad: 336×280 medium rectangle, the in-content standard. */}
            <AdSlot
              slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_INLINE}
              width={336}
              height={280}
              format="rectangle"
              className="mt-6 lg:hidden"
            />

            <div className="mt-10 space-y-10">
              <ExplainerSection title={`How to use the ${tool.name}`}>
                {content.howToUse.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-muted">
                    {paragraph}
                  </p>
                ))}
              </ExplainerSection>

              <ExplainerSection title="Examples">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {content.examples.map((example) => (
                    <figure
                      key={example.title}
                      className="overflow-hidden rounded-lg border border-border bg-surface"
                    >
                      <figcaption className="border-b border-border px-3 py-2">
                        <span className="block text-xs font-semibold text-foreground">
                          {example.title}
                        </span>
                        {example.note ? (
                          <span className="mt-0.5 block text-[11px] leading-5 text-muted">
                            {example.note}
                          </span>
                        ) : null}
                      </figcaption>
                      <ExampleRow label="Input" value={example.input} />
                      <ExampleRow label="Output" value={example.output} accent />
                    </figure>
                  ))}
                </div>
              </ExplainerSection>

              <ExplainerSection title="Frequently asked questions">
                <dl className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
                  {content.faq.map((entry) => (
                    <div key={entry.question} className="px-4 py-3">
                      <dt className="text-sm font-semibold text-foreground">
                        {entry.question}
                      </dt>
                      <dd className="mt-1 text-sm leading-6 text-muted">
                        {entry.answer}
                      </dd>
                    </div>
                  ))}
                </dl>
              </ExplainerSection>

              {related.length > 0 ? (
                <ExplainerSection title="Related tools">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {related.map((item) => (
                      <ToolCard key={item.slug} tool={item} />
                    ))}
                  </div>
                </ExplainerSection>
              ) : null}
            </div>
          </div>

          {/* Desktop ad: 300×600 half page, sticky, reserved from first paint. */}
          <div className="hidden w-[300px] shrink-0 lg:block">
            <AdSlot
              slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR}
              width={300}
              height={600}
              format="vertical"
              className="sticky top-20"
            />
          </div>
        </div>
      </div>
    </>
  );
}

function ExplainerSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function ExampleRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="border-t border-border first:border-t-0">
      <div className="px-3 pt-2 text-[10px] font-semibold tracking-wider text-muted-subtle uppercase">
        {label}
      </div>
      <pre
        className={`font-code overflow-x-auto px-3 pb-2.5 text-[11.5px] leading-5 whitespace-pre ${
          accent ? "text-accent" : "text-foreground"
        }`}
      >
        {value}
      </pre>
    </div>
  );
}
