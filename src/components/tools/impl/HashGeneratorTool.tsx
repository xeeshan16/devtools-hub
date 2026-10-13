"use client";

import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { InputPanel } from "@/components/tools/InputPanel";
import { Panel } from "@/components/tools/Panel";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import {
  HASH_ALGORITHMS,
  findMatchingDigest,
  hashText,
  type DigestEncoding,
  type Digests,
} from "@/lib/tools/hash";

const SAMPLE = "The quick brown fox jumps over the lazy dog";

const ENCODINGS = [
  { value: "hex", label: "Hex" },
  { value: "base64", label: "Base64" },
] as const satisfies readonly { value: DigestEncoding; label: string }[];

export function HashGeneratorTool() {
  const [input, setInput] = useState("");
  const [encoding, setEncoding] = useState<DigestEncoding>("hex");
  const [uppercase, setUppercase] = useState(false);
  const [expected, setExpected] = useState("");

  // crypto.subtle.digest is async, so the result lives in state behind an
  // effect with a cancellation guard: a slow digest for stale input can never
  // overwrite the result for newer input.
  const [digests, setDigests] = useState<Digests | null>(null);
  const [error, setError] = useState<string | null>(null);

  // An empty textarea shows placeholders rather than the digests of zero
  // bytes, which would look like output for input nobody typed.
  const hasInput = input.length > 0;

  useEffect(() => {
    if (!hasInput) return;

    let cancelled = false;
    hashText(input, { encoding, uppercase }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setDigests(result.value);
        setError(null);
      } else {
        setDigests(null);
        setError(result.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [input, encoding, uppercase, hasInput]);

  const shown = hasInput && !error ? digests : null;
  const match = shown ? findMatchingDigest(shown, expected, encoding) : null;
  const verifying = expected.trim().length > 0 && shown !== null;

  return (
    <div className="space-y-4">
      <InputPanel
        value={input}
        onChange={setInput}
        title="Text to hash"
        placeholder="Type or paste text. It is hashed as UTF-8, exactly as typed, including any trailing newline…"
        sample={SAMPLE}
        minRows={6}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Output encoding" options={ENCODINGS} value={encoding} onChange={setEncoding} />

        <label
          className={cn(
            "flex items-center gap-2 text-xs text-muted",
            encoding === "hex" ? "cursor-pointer" : "cursor-not-allowed opacity-50",
          )}
        >
          <input
            type="checkbox"
            checked={uppercase && encoding === "hex"}
            disabled={encoding !== "hex"}
            onChange={(e) => setUppercase(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--accent)]"
          />
          Uppercase hex
        </label>
      </div>

      {hasInput && error ? (
        <p role="alert" className="text-danger flex items-start gap-2 text-[13px] leading-6">
          <TriangleAlert className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-code break-words">{error}</span>
        </p>
      ) : null}

      <div className="grid gap-3">
        {HASH_ALGORITHMS.map(({ id, bits }) => {
          const value = shown?.[id] ?? "";
          const isMatch = verifying && match === id;
          return (
            <div
              key={id}
              className={cn(
                "flex min-w-0 items-start justify-between gap-2 rounded-lg border bg-surface p-3",
                isMatch ? "border-accent" : "border-border",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">
                  {id} <span className="font-normal text-muted">· {bits} bits</span>
                  {id === "SHA-1" ? (
                    <span className="font-normal text-muted"> · not collision-resistant</span>
                  ) : null}
                </p>
                <p className="font-code mt-1 text-[13px] break-all text-muted">
                  {value || "—"}
                </p>
              </div>
              <CopyButton value={value} size="icon" label={`Copy ${id}`} disabled={!value} />
            </div>
          );
        })}
      </div>

      <Panel title="Verify against a known hash">
        <div className="space-y-2 p-3">
          <input
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
            type="text"
            placeholder="Paste an expected digest, e.g. from a download page"
            aria-label="Expected hash"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="font-code h-9 w-full rounded-md border border-border bg-background px-2.5 text-[13px] text-foreground placeholder:text-muted focus:outline-none"
          />
          <p aria-live="polite" className="text-xs">
            {!verifying ? null : match ? (
              <span className="text-accent flex items-center gap-1.5">
                <CircleCheck className="h-3.5 w-3.5" aria-hidden />
                Matches the {match} digest.
              </span>
            ) : (
              <span className="text-danger flex items-center gap-1.5">
                <CircleX className="h-3.5 w-3.5" aria-hidden />
                No match for any algorithm in {encoding === "hex" ? "hex" : "Base64"}.
              </span>
            )}
          </p>
        </div>
      </Panel>
    </div>
  );
}
