"use client";

import { Command } from "cmdk";
import { FileText, Search, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toolPath, toolsByCategory } from "@/lib/tools/registry";

const PAGES = [
  { href: "/about", label: "About", icon: FileText },
  { href: "/privacy", label: "Privacy policy", icon: Shield },
  { href: "/terms", label: "Terms of use", icon: FileText },
];

/**
 * Mounted once in the root layout so ⌘K works from any page. The trigger in
 * the header dispatches the same custom event rather than lifting state into a
 * context provider that would have to wrap the whole tree.
 */
export const PALETTE_EVENT = "devtools-hub:open-palette";

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const groups = toolsByCategory();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }

    const onOpen = () => setOpen(true);

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(PALETTE_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(PALETTE_EVENT, onOpen);
    };
  }, []);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Search tools"
      className="fixed top-[15vh] left-1/2 z-50 w-[min(92vw,34rem)] -translate-x-1/2 overflow-hidden rounded-xl border border-border-strong bg-surface shadow-2xl"
    >
      <div className="flex items-center gap-2 border-b border-border px-3">
        <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        <Command.Input
          placeholder="Search tools…"
          className="h-11 w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
        />
      </div>

      <Command.List className="max-h-[min(24rem,60vh)] overflow-y-auto p-1.5">
        <Command.Empty className="px-3 py-6 text-center text-sm text-muted">
          No tools match that search.
        </Command.Empty>

        {groups.map((group) => (
          <Command.Group key={group.category} heading={group.category}>
            {group.tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Command.Item
                  key={tool.slug}
                  value={`${tool.name} ${tool.tagline} ${tool.keywords.join(" ")}`}
                  onSelect={() => go(toolPath(tool.slug))}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground"
                >
                  <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                  <span className="font-medium">{tool.name}</span>
                  <span className="truncate text-xs text-muted">
                    {tool.tagline}
                  </span>
                </Command.Item>
              );
            })}
          </Command.Group>
        ))}

        <Command.Group heading="Site">
          {PAGES.map((page) => {
            const Icon = page.icon;
            return (
              <Command.Item
                key={page.href}
                value={page.label}
                onSelect={() => go(page.href)}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                {page.label}
              </Command.Item>
            );
          })}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}

export function openCommandPalette() {
  window.dispatchEvent(new Event(PALETTE_EVENT));
}
