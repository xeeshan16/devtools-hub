"use client";

import { ArrowRightLeft, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { convertDotenv, type DotenvDirection } from "@/lib/tools/dotenv";

const DIRECTIONS = [
  { value: "env-to-json", label: ".env → JSON" },
  { value: "json-to-env", label: "JSON → .env" },
] as const satisfies readonly { value: DotenvDirection; label: string }[];

const SAMPLES: Record<DotenvDirection, string> = {
  "env-to-json": `# Application
NODE_ENV=development
PORT=3000 # local only
APP_NAME='Example App'

# Database
export DATABASE_URL=postgres://app:secret@localhost:5432/app
WELCOME_MESSAGE="Hello,\\nWelcome aboard"
PRIVATE_KEY="-----BEGIN KEY-----
MIIBexample
-----END KEY-----"
PORT=8080`,
  "json-to-env": `{
  "NODE_ENV": "production",
  "PORT": 8080,
  "FEATURE_FLAGS": "search,export",
  "APP_NAME": "Example App",
  "BANNER": "Line one\\nLine two",
  "DEBUG": false
}`,
};

export function EnvJsonTool() {
  const [input, setInput] = useState("");
  const [direction, setDirection] = useState<DotenvDirection>("env-to-json");

  const result = useMemo(() => convertDotenv(input, direction), [input, direction]);
  const conversion = result.ok ? result.value : null;

  function swap() {
    if (conversion?.output) setInput(conversion.output);
    setDirection((d) => (d === "env-to-json" ? "json-to-env" : "env-to-json"));
  }

  const [inputLabel, outputLabel] =
    direction === "env-to-json" ? [".env", "JSON"] : ["JSON", ".env"];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Conversion direction"
          options={DIRECTIONS}
          value={direction}
          onChange={setDirection}
        />
        <Button size="sm" variant="ghost" onClick={swap} className="ml-auto">
          <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden />
          Swap
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InputPanel
          value={input}
          onChange={setInput}
          title={inputLabel}
          placeholder={`Paste ${inputLabel} here…`}
          sample={SAMPLES[direction]}
          minRows={18}
        />
        <OutputPanel
          title={outputLabel}
          value={conversion?.output ?? ""}
          error={result.ok ? null : result.error}
          minRows={18}
        />
      </div>

      {conversion && conversion.warnings.length > 0 ? (
        <section aria-label="Conversion notes" className="rounded-lg border border-border bg-surface p-3">
          <h2 className="mb-2 text-xs font-semibold text-foreground">Notes</h2>
          <ul className="space-y-1.5">
            {conversion.warnings.map((warning) => (
              <li key={warning} className="flex items-start gap-2 text-xs leading-5 text-muted">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="break-words">{warning}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
