"use client";

import { ArrowRightLeft, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import {
  decodeHtml,
  encodeHtml,
  type EncodeScope,
  type EntityFormat,
} from "@/lib/tools/html-entities";

type Direction = "encode" | "decode";

const DIRECTIONS = [
  { value: "encode", label: "Encode" },
  { value: "decode", label: "Decode" },
] as const satisfies readonly { value: Direction; label: string }[];

const SCOPES = [
  {
    value: "essential",
    label: "Markup only",
    title: "Escape & < > \" and ' — enough for text and attribute values in a UTF-8 page",
  },
  {
    value: "non-ascii",
    label: "Also non-ASCII",
    title: "Also escape every character outside ASCII, so the output survives any encoding",
  },
] as const satisfies readonly { value: EncodeScope; label: string; title: string }[];

const FORMATS = [
  { value: "named", label: "Named", title: "&eacute; where a name exists, hex otherwise" },
  { value: "decimal", label: "Decimal", title: "&#233;" },
  { value: "hex", label: "Hex", title: "&#xE9;" },
] as const satisfies readonly { value: EntityFormat; label: string; title: string }[];

const SAMPLES: Record<Direction, string> = {
  encode: `<p class="note">Café & "crème brûlée" — 5 € ✅</p>`,
  decode: "&lt;p class=&quot;note&quot;&gt;Caf&eacute; &amp; &#8220;cr&egrave;me&#8221; &#x2014; 5 &euro;&lt;/p&gt;",
};

export function HtmlEntitiesTool() {
  const [input, setInput] = useState("");
  const [direction, setDirection] = useState<Direction>("encode");
  const [scope, setScope] = useState<EncodeScope>("essential");
  const [format, setFormat] = useState<EntityFormat>("named");

  const { output, error, warnings } = useMemo(() => {
    if (direction === "decode") {
      const decoded = decodeHtml(input);
      return { output: decoded.text, error: null, warnings: decoded.warnings };
    }
    const encoded = encodeHtml(input, { scope, format });
    return encoded.ok
      ? { output: encoded.value, error: null, warnings: [] }
      : { output: "", error: encoded.error, warnings: [] };
  }, [input, direction, scope, format]);

  /** Feeds the output back in and flips direction — the common round-trip check. */
  function swap() {
    if (!error && output) setInput(output);
    setDirection((d) => (d === "encode" ? "decode" : "encode"));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Direction" options={DIRECTIONS} value={direction} onChange={setDirection} />

        {direction === "encode" ? (
          <>
            <Segmented label="What to escape" options={SCOPES} value={scope} onChange={setScope} />
            {scope === "non-ascii" ? (
              <Segmented label="Reference format" options={FORMATS} value={format} onChange={setFormat} />
            ) : null}
          </>
        ) : null}

        <Button size="sm" variant="ghost" onClick={swap} className="ml-auto">
          <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden />
          Swap
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InputPanel
          value={input}
          onChange={setInput}
          title={direction === "encode" ? "Plain text or HTML" : "Escaped HTML"}
          placeholder={
            direction === "encode"
              ? "Type or paste the text to escape…"
              : "Paste text containing &amp;, &#233; or &#xE9; references…"
          }
          sample={SAMPLES[direction]}
        />

        <OutputPanel
          title={direction === "encode" ? "Escaped" : "Decoded text"}
          value={output}
          error={error}
        />
      </div>

      {warnings.length > 0 ? (
        <ul role="status" className="space-y-1 text-xs text-muted">
          {warnings.slice(0, 20).map((warning) => (
            <li key={warning} className="flex items-start gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {warning}
            </li>
          ))}
          {warnings.length > 20 ? <li>…and {warnings.length - 20} more.</li> : null}
        </ul>
      ) : null}
    </div>
  );
}
