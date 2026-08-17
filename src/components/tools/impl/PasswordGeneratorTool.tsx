"use client";

import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { Panel } from "@/components/tools/Panel";
import { Button } from "@/components/ui/button";
import { useClientValue } from "@/lib/use-client-value";
import {
  buildCharPool,
  CHAR_CLASS_LABELS,
  type CharClass,
  generatePassword,
  passwordEntropyBits,
  strengthLabel,
} from "@/lib/tools/password-generator";
import { cn } from "@/lib/utils";

const STRENGTH_BAR_STYLE: Record<ReturnType<typeof strengthLabel>, string> = {
  Weak: "bg-danger",
  Fair: "bg-danger",
  Strong: "bg-accent",
  "Very strong": "bg-success",
};

const STRENGTH_TEXT_STYLE: Record<ReturnType<typeof strengthLabel>, string> = {
  Weak: "text-danger",
  Fair: "text-danger",
  Strong: "text-accent",
  "Very strong": "text-success",
};

// Bar fill saturates around a strong-but-not-absurd password, so the meter
// has visible headroom instead of pinning at 100% for anything reasonable.
const BAR_MAX_BITS = 100;

export function PasswordGeneratorTool() {
  const [length, setLength] = useState(16);
  const [classes, setClasses] = useState<Record<CharClass, boolean>>({
    lower: true,
    upper: true,
    number: true,
    symbol: false,
  });
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [seed, setSeed] = useState(0);

  // crypto.getRandomValues yields different output on the server than on the
  // client, so the first password waits until after hydration — same gate
  // the UUID generator uses.
  const ready = useClientValue(() => true, false);

  const result = useMemo(() => {
    void seed;
    return ready
      ? generatePassword({ length, classes, excludeAmbiguous })
      : ({ ok: true, value: "" } as const);
  }, [ready, length, classes, excludeAmbiguous, seed]);

  const password = result.ok ? result.value : "";
  const error = result.ok ? null : result.error;

  const poolSize = buildCharPool({ classes, excludeAmbiguous }).length;
  const bits = passwordEntropyBits(length, poolSize);
  const label = strengthLabel(bits);

  function toggleClass(id: CharClass) {
    setClasses((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="space-y-4">
      <Panel
        title="Generated password"
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setSeed((v) => v + 1)}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Regenerate
            </Button>
            <CopyButton value={password} disabled={Boolean(error)} />
          </>
        }
        footer={
          error ? (
            <span role="alert" className="text-danger">
              {error}
            </span>
          ) : (
            <>
              <span className={cn("font-semibold", STRENGTH_TEXT_STYLE[label])}>
                {label}
              </span>
              <span className="tabular-nums">{bits.toFixed(1)} bits of entropy</span>
            </>
          )
        }
      >
        <div className="space-y-2 p-3">
          <p
            className={cn(
              "font-code break-all rounded-md border border-border bg-background p-3 text-lg leading-7",
              error ? "text-muted" : "text-foreground",
            )}
          >
            {password || <span className="text-muted">—</span>}
          </p>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className={cn("h-full transition-all", STRENGTH_BAR_STYLE[label])}
              style={{ width: `${Math.min(100, (bits / BAR_MAX_BITS) * 100)}%` }}
            />
          </div>
        </div>
      </Panel>

      <Panel title="Options">
        <div className="space-y-4 p-3">
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-foreground">
              Length <span className="tabular-nums text-muted">({length})</span>
            </span>
            <input
              type="range"
              min={4}
              max={128}
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              aria-label="Password length"
              className="h-1.5 w-2/3 max-w-xs cursor-pointer appearance-none rounded-full bg-surface-2 accent-accent"
            />
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            {CHAR_CLASS_LABELS.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground has-checked:border-accent has-checked:bg-accent-soft"
              >
                <input
                  type="checkbox"
                  checked={classes[c.id]}
                  onChange={() => toggleClass(c.id)}
                  className="accent-accent"
                />
                {c.label}
              </label>
            ))}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={excludeAmbiguous}
              onChange={(e) => setExcludeAmbiguous(e.target.checked)}
              className="accent-accent"
            />
            Exclude ambiguous characters
            <span className="font-code text-xs text-muted">(0 O 1 l I)</span>
          </label>
        </div>
      </Panel>
    </div>
  );
}
