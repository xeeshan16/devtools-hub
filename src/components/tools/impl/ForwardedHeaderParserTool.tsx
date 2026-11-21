"use client";

import { TriangleAlert } from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { InputPanel } from "@/components/tools/InputPanel";
import {
  buildForwarded,
  parseForwarded,
  type ForwardedElement,
  type ForwardedNode,
} from "@/lib/tools/forwarded-header";

const SAMPLE = 'Forwarded: for=203.0.113.195;host=example.com;proto=https, for="[2001:db8:cafe::17]:4711", for=10.0.4.12;by=_edge1';

const KIND_LABELS: Record<ForwardedNode["kind"], string> = {
  ipv4: "IPv4",
  ipv6: "IPv6",
  obfuscated: "obfuscated identifier",
  unknown: "unknown (hidden by the proxy)",
  invalid: "invalid",
};

function NodeValue({ node }: { node: ForwardedNode }) {
  return (
    <span>
      <span className={node.kind === "invalid" ? "font-code text-danger break-all" : "font-code break-all"}>{node.address ?? node.raw}</span>
      {node.port !== null && node.kind !== "invalid" ? <span className="font-code"> port {node.port}</span> : null}
      <span className="text-muted">
        {" "}
        ({KIND_LABELS[node.kind]}
        {node.scope ? `, ${node.scope}` : ""})
      </span>
    </span>
  );
}

function ElementCard({ element, index, total }: { element: ForwardedElement; index: number; total: number }) {
  const headingId = `fwd-element-${index}`;
  const role = index === 0 ? "added by the proxy closest to the client" : index === total - 1 ? "added by the proxy closest to your server" : "added by an intermediate proxy";
  const rows: [string, ReactNode][] = [];
  if (element.for) rows.push(["for", <NodeValue key="for" node={element.for} />]);
  if (element.by) rows.push(["by", <NodeValue key="by" node={element.by} />]);
  if (element.host !== null) rows.push(["host", <span key="host" className="font-code break-all">{element.host}</span>]);
  if (element.proto !== null) rows.push(["proto", <span key="proto" className="font-code">{element.proto}</span>]);
  const extra = element.pairs.filter((pair) => !["for", "by", "host", "proto"].includes(pair.name));

  return (
    <section aria-labelledby={headingId} className="rounded-lg border border-border bg-surface p-3">
      <h2 id={headingId} className="text-xs font-semibold tracking-wide text-muted uppercase">
        Hop {index + 1} <span className="font-normal normal-case">— {role}</span>
      </h2>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs leading-5">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="font-code text-muted">{label}</dt>
            <dd className="text-foreground">{value}</dd>
          </div>
        ))}
        {extra.map((pair, pairIndex) => (
          <div key={`${pairIndex}-${pair.name}`} className="contents">
            <dt className="font-code text-muted">{pair.name}</dt>
            <dd className="font-code break-all text-foreground">{pair.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ConvertField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  const id = useId();
  return (
    <div className="min-w-0 flex-1 basis-48">
      <label htmlFor={id} className="block text-xs leading-5 text-muted">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        className="font-code mt-1 w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-xs leading-5 text-foreground focus-visible:outline-2 focus-visible:outline-accent"
      />
    </div>
  );
}

function ConvertPanel() {
  const [forwardedFor, setForwardedFor] = useState("203.0.113.195, 2001:db8::1, 10.0.4.12");
  const [proto, setProto] = useState("https");
  const [host, setHost] = useState("example.com");
  const built = useMemo(() => buildForwarded({ forwardedFor, proto, host }), [forwardedFor, proto, host]);
  const header = built.ok && built.value ? `Forwarded: ${built.value}` : "";

  return (
    <section aria-labelledby="fwd-convert" className="rounded-lg border border-border bg-surface p-3">
      <h2 id="fwd-convert" className="text-xs font-semibold tracking-wide text-muted uppercase">
        Convert X-Forwarded-* headers
      </h2>
      <div className="mt-2 flex flex-wrap gap-3">
        <ConvertField label="X-Forwarded-For" value={forwardedFor} onChange={setForwardedFor} placeholder="203.0.113.195, 10.0.4.12" />
        <ConvertField label="X-Forwarded-Proto" value={proto} onChange={setProto} placeholder="https" />
        <ConvertField label="X-Forwarded-Host" value={host} onChange={setHost} placeholder="example.com" />
      </div>
      {!built.ok ? (
        <p role="alert" className="text-danger mt-2 flex items-start gap-2 text-xs leading-5">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{built.error}</span>
        </p>
      ) : null}
      {header ? (
        <div className="mt-2 flex items-start gap-2">
          <output aria-live="polite" className="font-code min-w-0 flex-1 text-xs leading-5 break-all text-foreground">
            {header}
          </output>
          <CopyButton value={header} size="icon" label="Copy header" />
        </div>
      ) : null}
    </section>
  );
}

export function ForwardedHeaderParserTool() {
  const [input, setInput] = useState("");

  const result = useMemo(() => parseForwarded(input), [input]);
  const value = result.ok ? result.value : null;

  return (
    <div className="space-y-4">
      <InputPanel
        value={input}
        onChange={setInput}
        title="Forwarded header"
        placeholder="Paste a Forwarded header, e.g. for=192.0.2.60;proto=https;by=203.0.113.43…"
        sample={SAMPLE}
        minRows={3}
        spellCheck={false}
      />

      {!result.ok ? (
        <p role="alert" className="text-danger flex items-start gap-2 text-[13px] leading-6">
          <TriangleAlert className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-code break-words">{result.error}</span>
        </p>
      ) : null}

      {value ? (
        <div className="space-y-3">
          {value.warnings.length > 0 ? (
            <section aria-labelledby="fwd-warnings" className="rounded-lg border border-border bg-surface p-3">
              <h2 id="fwd-warnings" className="text-xs font-semibold tracking-wide text-muted uppercase">
                Warnings ({value.warnings.length})
              </h2>
              <ul className="mt-2 space-y-1">
                {value.warnings.map((warning, warningIndex) => (
                  <li key={`${warningIndex}-${warning}`} className="text-danger flex items-start gap-2 text-xs leading-5">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {value.client ? (
            <p className="text-[13px] leading-6 text-foreground">
              Original client: <NodeValue node={value.client} />
              <span className="block text-xs leading-5 text-muted">
                Only trust this if every proxy in the chain is yours, because a client can send its own Forwarded header. Otherwise read the hops from the right and take the first for address that isn&apos;t one of your own proxies.
              </span>
            </p>
          ) : null}

          {value.elements.map((element, index) => (
            <ElementCard key={index} element={element} index={index} total={value.elements.length} />
          ))}
        </div>
      ) : null}

      <ConvertPanel />
    </div>
  );
}
