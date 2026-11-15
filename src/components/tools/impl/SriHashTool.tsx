"use client";

import { CircleCheck, CircleX, FileUp, Info, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { InputPanel } from "@/components/tools/InputPanel";
import { Panel } from "@/components/tools/Panel";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import {
  SRI_ALGORITHMS,
  buildTag,
  checkIntegrity,
  integrityForBytes,
  textToBytes,
  type IntegrityCheck,
  type IntegrityResult,
  type SriAlgorithm,
  type TagKind,
} from "@/lib/tools/sri";

type Source = "text" | "file";

const SOURCES = [
  { value: "text", label: "Paste text" },
  { value: "file", label: "Choose file" },
] as const satisfies readonly { value: Source; label: string }[];

const TAG_KINDS = [
  { value: "script", label: "<script>" },
  { value: "stylesheet", label: "<link> stylesheet" },
] as const satisfies readonly { value: TagKind; label: string }[];

const SAMPLE = "alert('Hello, world.');";

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

function ValueRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-2 rounded-lg border border-border bg-surface p-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">
          {label}
          {note ? <span className="font-normal text-muted"> · {note}</span> : null}
        </p>
        <p className="font-code mt-1 text-[13px] break-all whitespace-pre-wrap text-muted">{value || "—"}</p>
      </div>
      <CopyButton value={value} size="icon" label={`Copy ${label.toLowerCase()}`} disabled={!value} />
    </div>
  );
}

function CheckResult({ check }: { check: IntegrityCheck }) {
  const problems = check.parsed.tokens.filter((t) => t.problem);
  return (
    <div className="space-y-2 text-xs" aria-live="polite">
      {check.status === "match" ? (
        <p className="text-accent flex items-center gap-1.5">
          <CircleCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Matches. Browsers check the {check.algorithm} token and would load this content.
        </p>
      ) : check.status === "mismatch" ? (
        <div className="space-y-1">
          <p className="text-danger flex items-center gap-1.5">
            <CircleX className="h-3.5 w-3.5 shrink-0" aria-hidden />
            No {check.algorithm} token matches, so browsers would block this content.
          </p>
          <p className="font-code break-all text-muted">Content hashes to {check.expected}</p>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-muted">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
          No recognised sha256, sha384 or sha512 token, so browsers would load the content without checking it.
        </p>
      )}
      {problems.length > 0 ? (
        <ul className="space-y-1" aria-label="Problems with the integrity value">
          {problems.map((t, i) => (
            <li key={`${t.raw}-${i}`} className="text-danger flex items-start gap-1.5">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                <span className="font-code break-all">{t.raw}</span>: {t.problem}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function SriHashTool() {
  const [source, setSource] = useState<Source>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [algorithms, setAlgorithms] = useState<SriAlgorithm[]>(["sha384"]);
  const [tagKind, setTagKind] = useState<TagKind>("script");
  const [url, setUrl] = useState("");
  const [expected, setExpected] = useState("");

  // Hashing is async (crypto.subtle), so results live in state behind effects
  // with a cancellation guard: a slow digest for stale input never overwrites
  // the result for newer input.
  const [result, setResult] = useState<{ value: IntegrityResult | null; error: string | null }>({
    value: null,
    error: null,
  });
  const [check, setCheck] = useState<IntegrityCheck | null>(null);

  // Memoised so the hashing effect below only re-runs when the input changes.
  const textBytes = useMemo(() => (text.length > 0 ? textToBytes(text) : null), [text]);
  const bytes = source === "file" ? (file?.bytes ?? null) : textBytes?.ok ? textBytes.value : null;
  const inputError = source === "text" && textBytes && !textBytes.ok ? textBytes.error : null;

  useEffect(() => {
    if (!bytes) return;
    let cancelled = false;
    integrityForBytes(bytes, algorithms).then((r) => {
      if (cancelled) return;
      setResult(r.ok ? { value: r.value, error: null } : { value: null, error: r.error });
    });
    return () => {
      cancelled = true;
    };
  }, [bytes, algorithms]);

  const verifying = expected.trim().length > 0;

  useEffect(() => {
    if (!bytes || !verifying) return;
    let cancelled = false;
    checkIntegrity(bytes, expected).then((r) => {
      if (!cancelled) setCheck(r.ok ? r.value : null);
    });
    return () => {
      cancelled = true;
    };
  }, [bytes, expected, verifying]);

  const shown = bytes ? result : { value: null, error: null };
  const error = inputError ?? (source === "file" ? fileError : null) ?? shown.error;
  const integrity = shown.value?.integrity ?? "";

  function toggleAlgorithm(id: SriAlgorithm, on: boolean) {
    setAlgorithms((current) => (on ? [...current, id] : current.filter((a) => a !== id)));
  }

  async function onFile(selected: File | undefined) {
    setFileError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    try {
      setFile({ name: selected.name, bytes: new Uint8Array(await selected.arrayBuffer()) });
    } catch {
      setFile(null);
      setFileError(`Could not read ${selected.name}.`);
    }
  }

  return (
    <div className="space-y-4">
      <Segmented label="Content source" options={SOURCES} value={source} onChange={setSource} />

      {source === "text" ? (
        <InputPanel
          value={text}
          onChange={setText}
          title="File content"
          placeholder="Paste the exact contents of the script or stylesheet. It is hashed as UTF-8. Choose the file instead if it has Windows (CRLF) line endings…"
          sample={SAMPLE}
          minRows={8}
        />
      ) : (
        <Panel title="File">
          <div className="space-y-2 p-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-4 text-[13px] text-muted hover:text-foreground focus-within:outline focus-within:outline-2 focus-within:outline-[var(--accent)]">
              <FileUp className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 break-all">
                {file ? `${file.name} · ${file.bytes.length.toLocaleString()} bytes` : "Choose a .js, .css or any other file"}
              </span>
              <input
                type="file"
                className="sr-only"
                aria-label="File to hash"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
            <p className="text-xs text-muted">The file is read and hashed in your browser, byte for byte. It is never uploaded.</p>
          </div>
        </Panel>
      )}

      <fieldset className="flex flex-wrap items-center gap-4">
        <legend className="sr-only">Hash algorithms</legend>
        {SRI_ALGORITHMS.map(({ id }) => (
          <label key={id} className="flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={algorithms.includes(id)}
              onChange={(e) => toggleAlgorithm(id, e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--accent)]"
            />
            {id}
            {id === "sha384" ? <span className="text-muted">(recommended)</span> : null}
          </label>
        ))}
      </fieldset>

      {error ? <ErrorLine message={error} /> : null}

      <div className="space-y-3" aria-live="polite">
        <ValueRow
          label="Integrity"
          value={integrity}
          note={shown.value ? `${shown.value.byteLength.toLocaleString()} bytes hashed` : undefined}
        />
      </div>

      <Panel title="HTML tag">
        <div className="space-y-3 p-3">
          <div className="flex flex-wrap items-center gap-3">
            <Segmented label="Tag type" options={TAG_KINDS} value={tagKind} onChange={setTagKind} />
          </div>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            type="url"
            placeholder={tagKind === "script" ? "https://cdn.example.com/library.js" : "https://cdn.example.com/styles.css"}
            aria-label="Resource URL"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className={fieldClass}
          />
          <ValueRow label="Tag" value={integrity ? buildTag(tagKind, url, integrity) : ""} />
        </div>
      </Panel>

      <Panel title="Verify an integrity value">
        <div className="space-y-2 p-3">
          <input
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
            type="text"
            placeholder='Paste an integrity value or attribute, e.g. integrity="sha384-…"'
            aria-label="Integrity value to verify"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className={fieldClass}
          />
          {!verifying ? null : !bytes ? (
            <p className="text-xs text-muted">Add the file content above to check it against this value.</p>
          ) : check ? (
            <CheckResult check={check} />
          ) : null}
        </div>
      </Panel>

      <p className={cn("text-xs text-muted", source === "file" && "hidden")}>
        Text boxes turn Windows line endings into plain newlines, so pasted text can hash differently from the file
        a CDN serves. Choose the file to hash its exact bytes.
      </p>
    </div>
  );
}
