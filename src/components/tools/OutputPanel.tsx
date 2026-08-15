"use client";

import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { Panel } from "@/components/tools/Panel";
import { cn } from "@/lib/utils";

/**
 * Errors render inside the output panel rather than as a toast: the panel is
 * already reserving the space, so nothing on the page moves when one appears.
 */
export function OutputPanel({
  value,
  error,
  title = "Output",
  placeholder = "Output appears here.",
  actions,
  footer,
  children,
  className,
  minRows = 14,
}: {
  value: string;
  error?: string | null;
  title?: string;
  placeholder?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  /** Rich output (tables, highlighted matches) replaces the plain text body. */
  children?: ReactNode;
  className?: string;
  minRows?: number;
}) {
  return (
    <Panel
      title={title}
      className={className}
      actions={
        <>
          {actions}
          <CopyButton value={value} disabled={Boolean(error)} />
        </>
      }
      footer={
        footer ??
        (value ? (
          <span className="tabular-nums">
            {value.length.toLocaleString()} characters
          </span>
        ) : null)
      }
      bodyClassName="overflow-auto"
    >
      {error ? (
        <p
          role="alert"
          className="text-danger flex items-start gap-2 p-3 text-[13px] leading-6"
        >
          <TriangleAlert className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-code break-words">{error}</span>
        </p>
      ) : children ? (
        children
      ) : (
        <pre
          className={cn(
            "font-code m-0 p-3 text-[13px] leading-6 break-words whitespace-pre-wrap",
            value ? "text-foreground" : "text-muted",
          )}
          style={{ minHeight: `${minRows * 1.5}rem` }}
        >
          {value || placeholder}
        </pre>
      )}
    </Panel>
  );
}
