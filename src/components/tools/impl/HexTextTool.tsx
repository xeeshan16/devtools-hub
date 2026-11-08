"use client";

import { ArrowRightLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { hexToText, textToHex, type HexFormat } from "@/lib/tools/hex-text";

type Direction = "encode" | "decode";

const DIRECTIONS = [
  { value: "encode", label: "Text → Hex" },
  { value: "decode", label: "Hex → Text" },
] as const satisfies readonly { value: Direction; label: string }[];

const FORMATS = [
  { value: "plain", label: "48656c", title: "Continuous hex, as in hash digests" },
  { value: "spaced", label: "48 65 6c", title: "Bytes separated by spaces" },
  { value: "colon", label: "48:65:6c", title: "Bytes separated by colons" },
  { value: "c", label: "0x48, …", title: "Byte array literal for C, Java or JavaScript" },
  { value: "escape", label: "\\x48…", title: "\\x escapes for a string literal" },
] as const satisfies readonly { value: HexFormat; label: string; title: string }[];

const SAMPLES: Record<Direction, string> = {
  encode: "Hello, Zoë! 👋",
  decode: "48 65 6c 6c 6f 2c 20 5a 6f c3 ab 21 20 f0 9f 91 8b",
};

function plural(count: number, noun: string): string {
  return `${count.toLocaleString()} ${noun}${count === 1 ? "" : "s"}`;
}

export function HexTextTool() {
  const [input, setInput] = useState("");
  const [direction, setDirection] = useState<Direction>("encode");
  const [format, setFormat] = useState<HexFormat>("spaced");
  const [uppercase, setUppercase] = useState(false);

  const { output, error, bytes } = useMemo(() => {
    if (direction === "encode") {
      const hex = textToHex(input, { format, uppercase });
      return { output: hex, error: null, bytes: new TextEncoder().encode(input).length };
    }
    const decoded = hexToText(input);
    return decoded.ok
      ? { output: decoded.value.text, error: null, bytes: decoded.value.bytes }
      : { output: "", error: decoded.error, bytes: 0 };
  }, [input, direction, format, uppercase]);

  /** Feeds the output back in and flips direction, the usual round-trip check. */
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
            <Segmented label="Hex format" options={FORMATS} value={format} onChange={setFormat} />
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted select-none">
              <input
                type="checkbox"
                checked={uppercase}
                onChange={(e) => setUppercase(e.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--accent)]"
              />
              Uppercase
            </label>
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
          title={direction === "encode" ? "Text" : "Hex"}
          placeholder={
            direction === "encode"
              ? "Type or paste text to see its UTF-8 bytes in hex…"
              : "Paste hex: 48656c6c6f, 48 65 6c, 48:65:6c, 0x48, 0x65 or \\x48\\x65"
          }
          sample={SAMPLES[direction]}
          spellCheck={false}
        />

        <OutputPanel
          title={direction === "encode" ? "Hex (UTF-8)" : "Text"}
          value={output}
          error={error}
          footer={
            output ? (
              <span className="tabular-nums">
                {plural(bytes, "byte")} · {plural(Array.from(direction === "encode" ? input : output).length, "character")}
              </span>
            ) : null
          }
        />
      </div>
    </div>
  );
}
