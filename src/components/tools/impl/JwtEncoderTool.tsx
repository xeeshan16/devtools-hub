"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Panel } from "@/components/tools/Panel";
import { Segmented } from "@/components/ui/segmented";
import {
  JWT_ALGORITHMS,
  signJwt,
  type JwtAlgorithm,
} from "@/lib/tools/jwt-encoder";
import { toolPath } from "@/lib/tools/registry";

const DEFAULT_PAYLOAD = JSON.stringify(
  { sub: "1234567890", name: "Ada Lovelace", iat: 1717243200 },
  null,
  2,
);

function defaultHeader(alg: JwtAlgorithm): string {
  return JSON.stringify({ alg, typ: "JWT" }, null, 2);
}

const ALGORITHMS = JWT_ALGORITHMS.map((a) => ({
  value: a.id,
  label: a.id,
})) as { value: JwtAlgorithm; label: string }[];

export function JwtEncoderTool() {
  const [algorithm, setAlgorithm] = useState<JwtAlgorithm>("HS256");
  const [header, setHeader] = useState(defaultHeader("HS256"));
  const [headerTouched, setHeaderTouched] = useState(false);
  const [payload, setPayload] = useState("");
  const [secret, setSecret] = useState("");

  // Web Crypto's sign() is async, so this is the one tool on the site that
  // can't compute its output inside a plain useMemo — an effect plus a
  // cancellation guard stands in for that, so a fast edit can't let a
  // slower, stale sign() overwrite a newer one.
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasInput = payload.trim().length > 0 && secret.length > 0;

  useEffect(() => {
    // Nothing to sign yet — leave state untouched rather than setState
    // synchronously in the effect body, which would trigger a redundant
    // extra render. `hasInput` below gates what's actually displayed, so a
    // stale token left in state here is simply never shown.
    if (!hasInput) return;

    let cancelled = false;

    signJwt(header, payload, secret, algorithm).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setToken(result.value);
        setError(null);
      } else {
        setToken(null);
        setError(result.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [header, payload, secret, algorithm, hasInput]);

  function handleAlgorithmChange(next: JwtAlgorithm) {
    setAlgorithm(next);
    // Switching algorithms updates the header's alg claim to match, as long
    // as the header is still the untouched default — a hand-edited header
    // (a custom kid claim, say) is left alone rather than overwritten.
    if (!headerTouched) setHeader(defaultHeader(next));
  }

  function handleHeaderChange(value: string) {
    setHeader(value);
    setHeaderTouched(true);
  }

  return (
    <div className="space-y-4">
      <div
        role="alert"
        className="flex items-start gap-3 rounded-lg border border-danger/40 bg-danger-soft p-3.5"
      >
        <ShieldAlert className="text-danger mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div className="text-[13px] leading-6">
          <p className="text-danger font-semibold">
            Educational and testing tool only — not for production secrets.
          </p>
          <p className="text-danger/90">
            Signing happens entirely in your browser, but a real production
            signing key should never be pasted into any web page, including
            this one. Use a throwaway secret for testing, and treat any
            secret you do paste here as compromised.
          </p>
        </div>
      </div>

      <p className="text-xs text-muted">
        Need to decode a token instead?{" "}
        <Link href={toolPath("jwt-decoder")} className="text-accent hover:underline">
          Try the JWT Decoder
        </Link>
        .
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <InputPanel
          value={header}
          onChange={handleHeaderChange}
          title="Header"
          placeholder='{"alg":"HS256","typ":"JWT"}'
          minRows={5}
        />
        <InputPanel
          value={payload}
          onChange={setPayload}
          title="Payload"
          placeholder='{"sub":"1234567890"}'
          sample={DEFAULT_PAYLOAD}
          minRows={5}
        />
      </div>

      <Panel title="Secret key">
        <div className="p-3">
          <input
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            type="text"
            placeholder="Use a throwaway value — never a real production secret"
            aria-label="Secret key"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="font-code h-9 w-full rounded-md border border-border bg-background px-2.5 text-[13px] text-foreground placeholder:text-muted focus:outline-none"
          />
        </div>
      </Panel>

      <OutputPanel
        title="Signed token"
        value={hasInput ? (token ?? "") : ""}
        error={hasInput ? error : null}
        placeholder="Fill in a payload and a secret key to see the signed token here."
        actions={
          <Segmented
            label="Signing algorithm"
            options={ALGORITHMS}
            value={algorithm}
            onChange={handleAlgorithmChange}
          />
        }
        minRows={4}
      />
    </div>
  );
}
