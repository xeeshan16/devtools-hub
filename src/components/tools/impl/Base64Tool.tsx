"use client";

import { ArrowRightLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { decodeBase64, encodeBase64 } from "@/lib/tools/base64";

type Direction = "encode" | "decode";

const DIRECTIONS = [
  { value: "encode", label: "Encode" },
  { value: "decode", label: "Decode" },
] as const satisfies readonly { value: Direction; label: string }[];

const SAMPLES: Record<Direction, string> = {
  encode: "Hello, world! — UTF-8 safe ✅",
  decode: "SGVsbG8sIHdvcmxkISDigJQgVVRGLTggc2FmZSDinIU=",
};

export function Base64Tool() {
  const [input, setInput] = useState("");
  const [direction, setDirection] = useState<Direction>("encode");
  const [urlSafe, setUrlSafe] = useState(false);

  const result = useMemo(
    () =>
      direction === "encode"
        ? encodeBase64(input, urlSafe)
        : decodeBase64(input, urlSafe),
    [input, direction, urlSafe],
  );

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

        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={urlSafe}
            onChange={(e) => setUrlSafe(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--accent)]"
          />
          URL-safe (Base64URL)
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
          title={direction === "encode" ? "Plain text" : "Base64"}
          placeholder={
            direction === "encode"
              ? "Type or paste the text to encode…"
              : "Paste the Base64 string to decode…"
          }
          sample={SAMPLES[direction]}
        />

        <OutputPanel
          title={direction === "encode" ? "Base64" : "Decoded text"}
          value={result.ok ? result.value : ""}
          error={result.ok ? null : result.error}
        />
      </div>
    </div>
  );
}
