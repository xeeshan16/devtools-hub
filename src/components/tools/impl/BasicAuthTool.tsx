"use client";

import { Eye, EyeOff, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { InputPanel } from "@/components/tools/InputPanel";
import { Panel } from "@/components/tools/Panel";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { decodeBasicAuth, encodeBasicAuth } from "@/lib/tools/basic-auth";

type Direction = "encode" | "decode";

const DIRECTIONS = [
  { value: "encode", label: "Encode" },
  { value: "decode", label: "Decode" },
] as const satisfies readonly { value: Direction; label: string }[];

const SAMPLE_HEADER = "Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==";

const fieldClass =
  "font-code h-9 w-full rounded-md border border-border bg-background px-2.5 text-[13px] text-foreground placeholder:text-muted focus:outline-none";

function ErrorLine({ message }: { message: string }) {
  return (
    <p role="alert" className="text-danger flex items-start gap-2 text-[13px] leading-6">
      <TriangleAlert className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="font-code break-words">{message}</span>
    </p>
  );
}

function Warnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <ul className="space-y-1.5" aria-label="Warnings">
      {warnings.map((warning) => (
        <li key={warning} className="text-danger flex items-start gap-2 text-xs leading-5">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{warning}</span>
        </li>
      ))}
    </ul>
  );
}

function ValueRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-2 rounded-lg border border-border bg-surface p-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">
          {label}
          {note ? <span className="font-normal text-muted"> · {note}</span> : null}
        </p>
        <p className="font-code mt-1 text-[13px] break-all whitespace-pre-wrap text-muted">
          {value === "" ? <span className="italic">(empty)</span> : value}
        </p>
      </div>
      <CopyButton value={value} size="icon" label={`Copy ${label.toLowerCase()}`} disabled={!value} />
    </div>
  );
}

function EncodePanel() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const touched = username.length > 0 || password.length > 0;
  const result = useMemo(() => encodeBasicAuth(username, password), [username, password]);

  return (
    <div className="space-y-4">
      <Panel
        title="Credentials"
        actions={
          !touched ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setUsername("Aladdin");
                setPassword("open sesame");
              }}
            >
              Try an example
            </Button>
          ) : null
        }
      >
        <div className="grid gap-3 p-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs text-muted">
            <span>Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              type="text"
              placeholder="e.g. api_user"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              className={fieldClass}
            />
          </label>
          <label className="space-y-1.5 text-xs text-muted">
            <span>Password</span>
            <span className="flex gap-1">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder="Password or API key"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                className={fieldClass}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="h-9 w-9 shrink-0"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
              </Button>
            </span>
          </label>
        </div>
      </Panel>

      {!touched ? (
        <p className="text-[13px] text-muted">Enter a username and password to build the Authorization header.</p>
      ) : !result.ok ? (
        <ErrorLine message={result.error} />
      ) : (
        <div className="space-y-3" aria-live="polite">
          <Warnings warnings={result.value.warnings} />
          <ValueRow label="Header line" value={result.value.header} />
          <ValueRow label="Header value" value={result.value.value} />
          <ValueRow label="Credentials" value={result.value.token} note="base64 of username:password" />
        </div>
      )}
    </div>
  );
}

function DecodePanel() {
  const [input, setInput] = useState("");
  const result = useMemo(() => decodeBasicAuth(input), [input]);
  const hasInput = input.trim().length > 0;

  return (
    <div className="space-y-4">
      <InputPanel
        value={input}
        onChange={setInput}
        title="Authorization header"
        placeholder="Paste Authorization: Basic …, just Basic …, or the base64 credentials…"
        sample={SAMPLE_HEADER}
        minRows={3}
        spellCheck={false}
      />

      {!hasInput ? null : !result.ok ? (
        <ErrorLine message={result.error} />
      ) : (
        <div className="space-y-3" aria-live="polite">
          <Warnings warnings={result.value.warnings} />
          <div className="grid gap-3 lg:grid-cols-2">
            <ValueRow label="Username" value={result.value.username} />
            <ValueRow label="Password" value={result.value.password} />
          </div>
          <p className="text-xs text-muted">
            {result.value.headerName ? `${result.value.headerName} header · ` : null}
            Decoded as {result.value.charset}
          </p>
        </div>
      )}
    </div>
  );
}

export function BasicAuthTool() {
  const [direction, setDirection] = useState<Direction>("encode");

  return (
    <div className="space-y-4">
      <Segmented label="Direction" options={DIRECTIONS} value={direction} onChange={setDirection} />
      {direction === "encode" ? <EncodePanel /> : <DecodePanel />}
    </div>
  );
}
