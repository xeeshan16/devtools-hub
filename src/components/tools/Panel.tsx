import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Presentational shell shared by every input and output panel so the tools all
 * read as one instrument rather than eight separately-designed pages.
 */
export function Panel({
  title,
  actions,
  footer,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface",
        className,
      )}
    >
      <header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
          {title}
        </h2>
        {actions ? (
          <div className="flex items-center gap-1">{actions}</div>
        ) : null}
      </header>

      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>

      {footer ? (
        <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-border px-3 text-[11px] text-muted">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}
