"use client";

import { TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { parsePermissionsPolicy, type PermissionsAccess, type PermissionsFeature } from "@/lib/tools/permissions-policy";

const SAMPLE =
  'Permissions-Policy: camera=(), microphone=(), geolocation=(self "https://maps.example.com"), fullscreen=*, browsing-topics=()';

const ACCESS_LABEL: Record<PermissionsAccess, string> = {
  none: "Disabled",
  self: "Same origin",
  origins: "Listed origins",
  all: "Any origin",
};

function FeatureTable({ features }: { features: PermissionsFeature[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface p-3">
      <table className="w-full text-left text-xs">
        <caption className="pb-2 text-left font-semibold tracking-wide text-muted uppercase">
          Features ({features.length})
        </caption>
        <thead>
          <tr className="text-muted">
            <th scope="col" className="pb-2 pr-3 font-semibold">
              Feature
            </th>
            <th scope="col" className="pb-2 pr-3 font-semibold">
              Access
            </th>
            <th scope="col" className="pb-2 font-semibold">
              What it means
            </th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature) => (
            <tr key={feature.name} className="border-t border-border">
              <th scope="row" className="font-code py-2 pr-3 align-top font-normal break-all text-foreground">
                {feature.name}
                <span className="text-muted">={feature.allowlist || "(none)"}</span>
              </th>
              <td className="py-2 pr-3 align-top whitespace-nowrap text-foreground">{ACCESS_LABEL[feature.access]}</td>
              <td className="py-2 align-top leading-5">
                <span className="text-foreground">{feature.effect}</span>
                <span className={`block ${feature.known ? "text-muted" : "text-danger"}`}>{feature.description}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PermissionsPolicyTool() {
  const [input, setInput] = useState("");

  const result = useMemo(() => parsePermissionsPolicy(input), [input]);
  const value = result.ok ? result.value : null;

  return (
    <div className="space-y-4">
      <InputPanel
        value={input}
        onChange={setInput}
        title="Permissions-Policy header"
        placeholder="Paste a Permissions-Policy header, e.g. camera=(), geolocation=(self)…"
        sample={SAMPLE}
        minRows={2}
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
            <section aria-labelledby="pp-warnings" className="rounded-lg border border-border bg-surface p-3">
              <h2 id="pp-warnings" className="text-xs font-semibold tracking-wide text-muted uppercase">
                Warnings ({value.warnings.length})
              </h2>
              <ul className="mt-2 space-y-1">
                {value.warnings.map((warning) => (
                  <li key={warning} className="text-danger flex items-start gap-2 text-xs leading-5">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {value.valid ? (
            <>
              <FeatureTable features={value.features} />
              <p className="text-xs leading-5 text-muted">
                Features the header does not mention keep their browser default, which for most of them is the page&apos;s
                own origin and same-origin frames.
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
