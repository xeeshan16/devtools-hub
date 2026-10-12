"use client";

import { ArrowRightLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import { decodeUrl, encodeUrl, type EncodeScope } from "@/lib/tools/url-encoding";

type Direction = "encode" | "decode";

const DIRECTIONS = [
  { value: "encode", label: "Encode" },
  { value: "decode", label: "Decode" },
] as const satisfies readonly { value: Direction; label: string }[];

const SCOPES = [
  {
    value: "component",
    label: "Component",
    title: "Escape everything except letters, digits and - _ . ! ~ * ' ( ) — for one query value or path segment",
  },
  {
    value: "uri",
    label: "Full URL",
    title: "Keep : / ? # & = and the other characters that give a URL its structure",
  },
] as const satisfies readonly { value: EncodeScope; label: string; title: string }[];

const SAMPLES: Record<Direction, string> = {
  encode: "name=Zoë & friends / 100% ✅",
  decode: "name%3DZo%C3%AB%20%26%20friends%20%2F%20100%25%20%E2%9C%85",
};

export function UrlEncoderTool() {
  const [input, setInput] = useState("");
  const [direction, setDirection] = useState<Direction>("encode");
  const [scope, setScope] = useState<EncodeScope>("component");
  const [formEncoding, setFormEncoding] = useState(false);

  const result = useMemo(
    () =>
      direction === "encode"
        ? encodeUrl(input, { scope, plusForSpace: formEncoding })
        : decodeUrl(input, { plusAsSpace: formEncoding }),
    [input, direction, scope, formEncoding],
  );

  // A + in a full URL's path is a literal plus, so form encoding only applies to components.
  const formEncodingDisabled = direction === "encode" && scope === "uri";

  /** Feeds the output back in and flips direction — the common round-trip check. */
  function swap() {
    if (result.ok && result.value) setInput(result.value);
    setDirection((d) => (d === "encode" ? "decode" : "encode"));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Direction"
          options={DIRECTIONS}
          value={direction}
          onChange={setDirection}
        />

        {direction === "encode" ? (
          <Segmented label="What to encode" options={SCOPES} value={scope} onChange={setScope} />
        ) : null}

        <label
          className={cn(
            "flex items-center gap-2 text-xs text-muted",
            formEncodingDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          )}
        >
          <input
            type="checkbox"
            checked={formEncoding && !formEncodingDisabled}
            disabled={formEncodingDisabled}
            onChange={(e) => setFormEncoding(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--accent)]"
          />
          Form encoding (+ for spaces)
        </label>

        <Button size="sm" variant="ghost" onClick={swap} className="ml-auto">
          <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden />
          Swap
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InputPanel
          value={input}
          onChange={setInput}
          title={direction === "encode" ? "Plain text" : "Encoded text"}
          placeholder={
            direction === "encode"
              ? "Type or paste the text or URL to encode…"
              : "Paste the percent-encoded string to decode…"
          }
          sample={SAMPLES[direction]}
        />

        <OutputPanel
          title={direction === "encode" ? "Percent-encoded" : "Decoded text"}
          value={result.ok ? result.value : ""}
          error={result.ok ? null : result.error}
        />
      </div>
    </div>
  );
}
