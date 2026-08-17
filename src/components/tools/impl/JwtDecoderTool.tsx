"use client";

import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { InputPanel } from "@/components/tools/InputPanel";
import { Panel } from "@/components/tools/Panel";
import { decodeJwt, type JwtClaimNote } from "@/lib/tools/jwt";
import { toolPath } from "@/lib/tools/registry";

const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsImlhdCI6MTcxNzI0MzIwMCwiZXhwIjoxNzE3MjQ2ODAwLCJpc3MiOiJkZXZ0b29scy1odWIifQ.7bMBjBK2SbTfeJZlZ7ZJhTxRWQzYyXQ0uZ0JwZKbT2Q";

const STATUS_ICON = {
  ok: CircleCheck,
  warn: TriangleAlert,
  error: CircleAlert,
  info: Info,
} as const;

const STATUS_CLASS = {
  ok: "text-success",
  warn: "text-danger",
  error: "text-danger",
  info: "text-muted",
} as const;

export function JwtDecoderTool() {
  const [input, setInput] = useState("");

  const result = useMemo(
    () => (input.trim() ? decodeJwt(input) : null),
    [input],
  );

  const decoded = result?.ok ? result.value : null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Need to sign a token instead?{" "}
        <Link href={toolPath("jwt-encoder")} className="text-accent hover:underline">
          Try the JWT Encoder
        </Link>
        .
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <InputPanel
          value={input}
          onChange={setInput}
          title="Encoded token"
          placeholder="Paste a JWT (a Bearer prefix is fine)…"
          sample={SAMPLE}
          minRows={10}
          footer={
            decoded ? (
              <span
                className={
                  decoded.expired === true ? "text-danger" : "text-muted"
                }
              >
                {decoded.expired === true
                  ? "This token has expired."
                  : decoded.expired === false
                    ? "This token has not expired."
                    : "No exp claim — this token does not expire on its own."}
              </span>
            ) : undefined
          }
        />

        <Panel
          title="Claims"
          footer={
            <span>
              Decoding only — the signature is not verified, which needs the
              issuer&rsquo;s secret or public key.
            </span>
          }
        >
          {result && !result.ok ? (
            <p role="alert" className="text-danger p-3 text-[13px] leading-6">
              {result.error}
            </p>
          ) : decoded ? (
            <ul className="divide-y divide-border">
              {decoded.notes.map((note) => (
                <ClaimRow key={note.claim} note={note} />
              ))}
            </ul>
          ) : (
            <p className="p-3 text-xs leading-6 text-muted">
              Paste a token to see its algorithm, issuer, subject, audience and
              validity window broken out here.
            </p>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Segment title="Header" value={decoded?.headerJson ?? ""} />
        <Segment title="Payload" value={decoded?.payloadJson ?? ""} />
        <Segment
          title="Signature"
          value={decoded?.signature ?? ""}
          hint="Base64URL — verify it against the signing key on your server."
        />
      </div>
    </div>
  );
}

function ClaimRow({ note }: { note: JwtClaimNote }) {
  const Icon = STATUS_ICON[note.status];
  return (
    <li className="flex items-start gap-2.5 px-3 py-2">
      <Icon
        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${STATUS_CLASS[note.status]}`}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">
          {note.label}
          <code className="font-code ml-1.5 text-[11px] font-normal text-muted">
            {note.claim}
          </code>
        </p>
        <p className="font-code mt-0.5 text-[12px] break-words text-muted">
          {note.detail}
        </p>
      </div>
    </li>
  );
}

function Segment({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <Panel
      title={title}
      actions={<CopyButton value={value} />}
      footer={hint ? <span>{hint}</span> : undefined}
      bodyClassName="overflow-auto"
    >
      <pre className="font-code m-0 min-h-[9rem] p-3 text-[12px] leading-6 break-all whitespace-pre-wrap text-foreground">
        {value || <span className="text-muted">—</span>}
      </pre>
    </Panel>
  );
}
