"use client";

import { ArrowRightLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { decodeBase32, encodeBase32, type Base32Variant } from "@/lib/tools/base32";

type Direction = "encode" | "decode";

const DIRECTIONS = [
  { value: "encode", label: "Encode" },
  { value: "decode", label: "Decode" },
] as const satisfies readonly { value: Direction; label: string }[];

const VARIANTS = [
  { value: "rfc4648", label: "RFC 4648", title: "Standard alphabet A-Z, 2-7 (TOTP secrets, onion addresses)" },
  { value: "hex", label: "Base32hex", title: "Extended hex alphabet 0-9, A-V, which preserves sort order" },
  { value: "crockford", label: "Crockford", title: "Crockford's alphabet without I, L, O and U, as used by ULID" },
] as const satisfies readonly { value: Base32Variant; label: string; title: string }[];

const SAMPLES: Record<Direction, string> = {
  encode: "Hello, Zoë! 👋",
  decode: "JBSWY3DPEBLW64TMMQQQ====",
};

function plural(count: number, noun: string): string {
  return `${count.toLocaleString()} ${noun}${count === 1 ? "" : "s"}`;
}

export function Base32Tool() {
  const [input, setInput] = useState("");
  const [direction, setDirection] = useState<Direction>("encode");
  const [variant, setVariant] = useState<Base32Variant>("rfc4648");
  const [padding, setPadding] = useState(true);

  const { output, error, bytes, binary } = useMemo(() => {
    if (direction === "encode") {
      return {
        output: encodeBase32(input, { variant, padding }),
        error: null,
        bytes: new TextEncoder().encode(input).length,
        binary: false,
      };
    }
    const decoded = decodeBase32(input, variant);
    if (!decoded.ok) return { output: "", error: decoded.error, bytes: 0, binary: false };
    const { text, hex } = decoded.value;
    // Binary payloads such as TOTP secrets are shown as hex rather than as
    // replacement characters.
    return { output: text ?? hex, error: null, bytes: decoded.value.bytes, binary: text === null };
  }, [input, direction, variant, padding]);

  /** Feeds the output back in and flips direction, the usual round-trip check. */
  function swap() {
    if (!error && output && !binary) setInput(output);
    setDirection((d) => (d === "encode" ? "decode" : "encode"));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Direction" options={DIRECTIONS} value={direction} onChange={setDirection} />
        <Segmented label="Alphabet" options={VARIANTS} value={variant} onChange={setVariant} />

        {direction === "encode" && variant !== "crockford" ? (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted select-none">
            <input
              type="checkbox"
              checked={padding}
              onChange={(e) => setPadding(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--accent)]"
            />
            Padding (=)
          </label>
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
          title={direction === "encode" ? "Text" : "Base32"}
          placeholder={
            direction === "encode"
              ? "Type or paste text to encode its UTF-8 bytes as Base32…"
              : "Paste Base32, e.g. JBSWY3DPEHPK3PXP. Case, spaces and missing padding are fine."
          }
          sample={SAMPLES[direction]}
          spellCheck={false}
        />

        <OutputPanel
          title={direction === "encode" ? "Base32" : binary ? "Bytes (hex, not UTF-8 text)" : "Text"}
          value={output}
          error={error}
          footer={
            output ? (
              <span className="tabular-nums">
                {plural(bytes, "byte")} · {plural((direction === "encode" ? output : input).replace(/[\s=-]/g, "").length, "Base32 character")}
              </span>
            ) : null
          }
        />
      </div>
    </div>
  );
}
