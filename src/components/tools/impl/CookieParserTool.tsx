"use client";

import { Info, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { InputPanel } from "@/components/tools/InputPanel";
import { Segmented } from "@/components/ui/segmented";
import { parseCookies, type CookieMode, type CookiePair, type SetCookie } from "@/lib/tools/cookie";

const MODES = [
  { value: "auto", label: "Auto", title: "Detect from a Set-Cookie: prefix or cookie attributes" },
  { value: "cookie", label: "Cookie", title: "A Cookie request header: name=value pairs" },
  { value: "set-cookie", label: "Set-Cookie", title: "Set-Cookie response headers, one per line" },
] as const satisfies readonly { value: CookieMode; label: string; title: string }[];

const SAMPLES: Record<CookieMode, string> = {
  auto: [
    "Set-Cookie: __Host-session=8f3a2c; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=86400",
    "Set-Cookie: tracking=abc; Domain=.example.com; SameSite=None",
    "Set-Cookie: theme=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/",
  ].join("\n"),
  cookie: "Cookie: session=8f3a2c; theme=dark; cart=%7B%22items%22%3A2%7D; session=old",
  "set-cookie": "Set-Cookie: id=a3fWa; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Secure; HttpOnly",
};

const LIFETIME_LABEL: Record<SetCookie["lifetime"], string> = {
  session: "Session (until the browser closes)",
  persistent: "Persistent",
  delete: "Deletes the cookie",
};

function formatDuration(seconds: number): string {
  if (seconds <= 0) return `${seconds}s (expires immediately)`;
  const units: [number, string][] = [
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];
  for (const [size, unit] of units) {
    if (seconds >= size && seconds % size === 0) {
      const n = seconds / size;
      return `${seconds.toLocaleString()}s (${n.toLocaleString()} ${unit}${n === 1 ? "" : "s"})`;
    }
  }
  return `${seconds.toLocaleString()}s`;
}

function attributeRows(cookie: SetCookie): { name: string; value: string }[] {
  const yes = (flag: boolean) => (flag ? "Yes" : "No");
  return [
    { name: "Value", value: cookie.value },
    ...(cookie.decoded !== cookie.value ? [{ name: "Decoded value", value: cookie.decoded }] : []),
    { name: "Lifetime", value: LIFETIME_LABEL[cookie.lifetime] },
    { name: "Expires", value: cookie.expires ?? "" },
    { name: "Max-Age", value: cookie.maxAge === null ? "" : formatDuration(cookie.maxAge) },
    { name: "Domain", value: cookie.domain ?? "(host-only)" },
    { name: "Path", value: cookie.path ?? "(default)" },
    { name: "Secure", value: yes(cookie.secure) },
    { name: "HttpOnly", value: yes(cookie.httpOnly) },
    { name: "SameSite", value: cookie.sameSite ?? "(browser default)" },
    { name: "Partitioned", value: yes(cookie.partitioned) },
    ...cookie.unknown.map((a) => ({ name: `${a.name} (ignored)`, value: a.value })),
  ];
}

function SetCookieCard({ cookie, index }: { cookie: SetCookie; index: number }) {
  const headingId = `set-cookie-${index}`;
  return (
    <section aria-labelledby={headingId} className="rounded-lg border border-border bg-surface p-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h2 id={headingId} className="font-code min-w-0 text-[13px] font-semibold break-all text-foreground">
          {cookie.name || <span className="text-muted">(no name)</span>}
        </h2>
        <CopyButton value={cookie.decoded} size="icon" label={`Copy value of ${cookie.name || "cookie"}`} disabled={!cookie.value} />
      </div>

      {cookie.warnings.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {cookie.warnings.map((warning) => (
            <li key={warning} className="text-danger flex items-start gap-2 text-xs leading-5">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
        {attributeRows(cookie).map(({ name, value }) => (
          <div key={name} className="contents">
            <dt className="text-muted">{name}</dt>
            <dd className="font-code break-all text-foreground">{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CookieTable({ pairs }: { pairs: CookiePair[] }) {
  const hasDuplicates = pairs.some((p) => p.duplicate);
  return (
    <div className="space-y-2">
      {hasDuplicates ? (
        <p className="flex items-start gap-2 text-xs leading-5 text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Some names appear more than once, usually because cookies with the same name were set for different paths or
            domains. Servers differ in which one they read, which makes this a common source of stale-session bugs.
          </span>
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-border bg-surface p-3">
        <table className="w-full text-left text-xs">
          <caption className="pb-2 text-left font-semibold tracking-wide text-muted uppercase">
            Cookies ({pairs.length})
          </caption>
          <thead>
            <tr className="text-muted">
              <th scope="col" className="pb-2 font-semibold">
                Name
              </th>
              <th scope="col" className="pb-2 font-semibold">
                Decoded value
              </th>
              <th scope="col" className="pb-2">
                <span className="sr-only">Copy</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pairs.map(({ name, decoded, duplicate }, index) => (
              <tr key={`${index}-${name}`} className="border-t border-border">
                <th scope="row" className="font-code py-2 pr-3 align-top font-normal break-all text-foreground">
                  {name || <span className="text-muted">(no name)</span>}
                  {duplicate ? <span className="ml-2 font-sans text-muted">(repeated)</span> : null}
                </th>
                <td className="font-code py-2 pr-3 align-top break-all text-muted">{decoded || "—"}</td>
                <td className="py-1 text-right align-top">
                  <CopyButton value={decoded} size="icon" label={`Copy value of ${name || "unnamed cookie"}`} disabled={!decoded} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CookieParserTool() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<CookieMode>("auto");

  const result = useMemo(() => parseCookies(input, mode), [input, mode]);
  const value = result.ok ? result.value : null;

  return (
    <div className="space-y-4">
      <Segmented label="Header type" options={MODES} value={mode} onChange={setMode} />

      <InputPanel
        value={input}
        onChange={setInput}
        title={mode === "cookie" ? "Cookie header" : mode === "set-cookie" ? "Set-Cookie headers" : "Cookie or Set-Cookie headers"}
        placeholder="Paste a Cookie header, or one Set-Cookie header per line…"
        sample={SAMPLES[mode]}
        minRows={3}
        spellCheck={false}
      />

      {!result.ok ? (
        <p role="alert" className="text-danger flex items-start gap-2 text-[13px] leading-6">
          <TriangleAlert className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-code break-words">{result.error}</span>
        </p>
      ) : null}

      {value?.kind === "cookie" ? <CookieTable pairs={value.pairs} /> : null}

      {value?.kind === "set-cookie" ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {value.cookies.map((cookie, index) => (
            <SetCookieCard key={`${index}-${cookie.name}`} cookie={cookie} index={index} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
