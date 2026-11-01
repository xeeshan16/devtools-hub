"use client";

import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { InputPanel } from "@/components/tools/InputPanel";
import { Panel } from "@/components/tools/Panel";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import type { DigestEncoding } from "@/lib/tools/hash";
import {
  HMAC_ALGORITHMS,
  hmacText,
  signatureMatches,
  type HmacAlgorithm,
  type KeyEncoding,
} from "@/lib/tools/hmac";

const SAMPLE = "Hello, World!";

const ALGORITHMS = HMAC_ALGORITHMS.map(({ id, label }) => ({ value: id, label: label.replace("HMAC-", "") }));

const KEY_ENCODINGS = [
  { value: "utf8", label: "Text" },
  { value: "hex", label: "Hex" },
  { value: "base64", label: "Base64" },
] as const satisfies readonly { value: KeyEncoding; label: string }[];

const ENCODINGS = [
  { value: "hex", label: "Hex" },
  { value: "base64", label: "Base64" },
] as const satisfies readonly { value: DigestEncoding; label: string }[];

const fieldClass =
  "font-code h-9 w-full rounded-md border border-border bg-background px-2.5 text-[13px] text-foreground placeholder:text-muted focus:outline-none";

export function HmacGeneratorTool() {
  const [message, setMessage] = useState("");
  const [key, setKey] = useState("");
  const [keyEncoding, setKeyEncoding] = useState<KeyEncoding>("utf8");
  const [algorithm, setAlgorithm] = useState<HmacAlgorithm>("SHA-256");
  const [encoding, setEncoding] = useState<DigestEncoding>("hex");
  const [uppercase, setUppercase] = useState(false);
  const [expected, setExpected] = useState("");

  // crypto.subtle.sign is async, so the result lives in state behind an effect
  // with a cancellation guard: a slow signature for stale input can never
  // overwrite the result for newer input.
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Nothing is shown until there is a key: an HMAC without one is meaningless.
  const hasKey = key.length > 0;

  useEffect(() => {
    if (!hasKey) return;

    let cancelled = false;
    hmacText(message, key, { algorithm, keyEncoding, encoding, uppercase }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setSignature(result.value);
        setError(null);
      } else {
        setSignature(null);
        setError(result.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [message, key, algorithm, keyEncoding, encoding, uppercase, hasKey]);

  const shown = hasKey && !error ? (signature ?? "") : "";
  const verifying = expected.trim().length > 0 && shown.length > 0;
  const matches = verifying && signatureMatches(shown, expected, encoding);
  const label = HMAC_ALGORITHMS.find((a) => a.id === algorithm)?.label ?? algorithm;

  return (
    <div className="space-y-4">
      <InputPanel
        value={message}
        onChange={setMessage}
        title="Message"
        placeholder="Paste the exact payload to sign, e.g. a raw webhook request body. It is signed as UTF-8, byte for byte…"
        sample={SAMPLE}
        minRows={6}
      />

      <Panel title="Secret key">
        <div className="space-y-2 p-3">
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            type="text"
            placeholder={
              keyEncoding === "utf8"
                ? "Type the shared secret"
                : keyEncoding === "hex"
                  ? "Hex bytes, e.g. 0b0b0b0b…"
                  : "Base64 or Base64URL bytes"
            }
            aria-label="Secret key"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            className={fieldClass}
          />
          <Segmented label="Key format" options={KEY_ENCODINGS} value={keyEncoding} onChange={setKeyEncoding} />
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Algorithm" options={ALGORITHMS} value={algorithm} onChange={setAlgorithm} />
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

      {hasKey && error ? (
        <p role="alert" className="text-danger flex items-start gap-2 text-[13px] leading-6">
          <TriangleAlert className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-code break-words">{error}</span>
        </p>
      ) : null}

      <div className="flex min-w-0 items-start justify-between gap-2 rounded-lg border border-border bg-surface p-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">
            {label}
            {algorithm === "SHA-1" ? <span className="font-normal text-muted"> · legacy</span> : null}
          </p>
          <p className="font-code mt-1 text-[13px] break-all text-muted" aria-live="polite">
            {shown || (hasKey ? "—" : "Enter a secret key to compute the signature.")}
          </p>
        </div>
        <CopyButton value={shown} size="icon" label={`Copy ${label}`} disabled={!shown} />
      </div>

      <Panel title="Verify a signature">
        <div className="space-y-2 p-3">
          <input
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
            type="text"
            placeholder="Paste a signature header value, e.g. sha256=757107ea…"
            aria-label="Expected signature"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className={fieldClass}
          />
          <p aria-live="polite" className="text-xs">
            {!verifying ? null : matches ? (
              <span className="text-accent flex items-center gap-1.5">
                <CircleCheck className="h-3.5 w-3.5" aria-hidden />
                Signature matches.
              </span>
            ) : (
              <span className="text-danger flex items-center gap-1.5">
                <CircleX className="h-3.5 w-3.5" aria-hidden />
                No match. Check the algorithm, key format and that the message is byte-for-byte identical.
              </span>
            )}
          </p>
        </div>
      </Panel>
    </div>
  );
}
