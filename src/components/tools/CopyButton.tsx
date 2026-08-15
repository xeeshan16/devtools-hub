"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Copy is the single most-used action on the site, so it gets an explicit
 * confirmation state rather than relying on the OS clipboard indicator.
 */
export function CopyButton({
  value,
  label = "Copy",
  size = "sm",
  className,
  disabled,
}: {
  value: string;
  label?: string;
  size?: "sm" | "md" | "icon";
  className?: string;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API is unavailable over plain HTTP and in some embedded
      // browsers; the legacy path keeps the button working there.
      const area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }

    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  const Icon = copied ? Check : Copy;

  return (
    <Button
      size={size}
      variant="ghost"
      onClick={copy}
      disabled={disabled || !value}
      aria-label={copied ? "Copied" : label}
      className={cn(copied && "text-success", className)}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {size === "icon" ? null : (
        <span className="tabular-nums">{copied ? "Copied" : label}</span>
      )}
    </Button>
  );
}
