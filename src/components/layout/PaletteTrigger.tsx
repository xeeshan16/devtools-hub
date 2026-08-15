"use client";

import { Search } from "lucide-react";
import { openCommandPalette } from "@/components/layout/CommandPalette";
import { useClientValue } from "@/lib/use-client-value";

export function PaletteTrigger() {
  const isMac = useClientValue(
    () => /Mac|iPhone|iPad/.test(navigator.userAgent),
    false,
  );

  return (
    <button
      type="button"
      onClick={openCommandPalette}
      className="flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-foreground"
    >
      <Search className="h-3.5 w-3.5" aria-hidden />
      <span className="hidden sm:inline">Search tools</span>
      <kbd className="hidden rounded border border-border bg-surface-2 px-1.5 py-0.5 font-sans text-[10px] sm:inline">
        {isMac ? "⌘" : "Ctrl "}K
      </kbd>
    </button>
  );
}
