import type { ReactNode } from "react";

/**
 * Shared wrapper for the written pages (about, privacy, terms). Tailwind v4
 * here has no typography plugin, so the element styles are declared once
 * instead of being repeated on every heading and paragraph.
 */
export function Prose({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro?: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 lg:px-6 lg:py-14">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      {intro ? (
        <p className="mt-3 text-sm leading-7 text-muted">{intro}</p>
      ) : null}
      {updated ? (
        <p className="mt-2 text-xs text-muted">Last updated {updated}</p>
      ) : null}

      <div
        className={[
          "mt-8 space-y-4 text-sm leading-7 text-muted",
          "[&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground",
          "[&_h3]:mt-6 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground",
          "[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5",
          "[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2",
          "[&_strong]:font-semibold [&_strong]:text-foreground",
        ].join(" ")}
      >
        {children}
      </div>
    </article>
  );
}
