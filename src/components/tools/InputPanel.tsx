"use client";

import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Panel } from "@/components/tools/Panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InputPanel({
  value,
  onChange,
  title = "Input",
  placeholder,
  actions,
  footer,
  sample,
  className,
  spellCheck = false,
  minRows = 14,
}: {
  value: string;
  onChange: (value: string) => void;
  title?: string;
  placeholder?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  /** Optional one-click example so the tool is never a blank page. */
  sample?: string;
  className?: string;
  spellCheck?: boolean;
  minRows?: number;
}) {
  return (
    <Panel
      title={title}
      className={className}
      actions={
        <>
          {actions}
          {sample !== undefined && !value ? (
            <Button size="sm" variant="ghost" onClick={() => onChange(sample)}>
              Try an example
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange("")}
            disabled={!value}
            aria-label="Clear input"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Clear
          </Button>
        </>
      }
      footer={
        footer ?? (
          <span className="tabular-nums">
            {value.length.toLocaleString()} characters
            {value ? ` · ${value.split("\n").length.toLocaleString()} lines` : ""}
          </span>
        )
      }
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={spellCheck}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label={title}
        rows={minRows}
        className={cn(
          "font-code block h-full w-full resize-y bg-transparent p-3 text-[13px] leading-6",
          "text-foreground placeholder:text-muted focus:outline-none",
        )}
      />
    </Panel>
  );
}
