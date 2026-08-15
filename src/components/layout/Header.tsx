import { Terminal } from "lucide-react";
import Link from "next/link";
import { PaletteTrigger } from "@/components/layout/PaletteTrigger";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { site } from "@/lib/site";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 lg:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-fg">
            <Terminal className="h-4 w-4" aria-hidden />
          </span>
          {site.name}
        </Link>

        <nav className="ml-2 hidden items-center gap-4 text-sm text-muted sm:flex">
          <Link href="/" className="hover:text-foreground">
            All tools
          </Link>
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <PaletteTrigger />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
