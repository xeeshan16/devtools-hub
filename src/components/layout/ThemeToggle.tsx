"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useClientValue } from "@/lib/use-client-value";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // The resolved theme is only known on the client, so the icon can't be
  // rendered during SSR without risking a hydration mismatch.
  const mounted = useClientValue(() => true, false);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      // The label depends on resolvedTheme, which is unknown until after
      // mount — same as the icon below, it has to stay generic until then
      // or the text itself becomes a hydration mismatch.
      aria-label={mounted ? `Switch to ${isDark ? "light" : "dark"} theme` : "Toggle theme"}
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-4 w-4" aria-hidden />
        ) : (
          <Moon className="h-4 w-4" aria-hidden />
        )
      ) : (
        <span className="h-4 w-4" />
      )}
    </Button>
  );
}
