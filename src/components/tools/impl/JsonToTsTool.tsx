"use client";

import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Segmented } from "@/components/ui/segmented";
import { jsonToTs, type DeclarationStyle } from "@/lib/tools/json-to-ts";

const SAMPLE = `{
  "id": 1042,
  "status": "shipped",
  "customer": { "name": "Ada Lovelace", "email": "ada@example.com" },
  "items": [
    { "sku": "KB-01", "quantity": 1, "price": 89.5 },
    { "sku": "MS-07", "quantity": 2, "price": 24, "giftWrap": true }
  ],
  "coupon": null,
  "tags": []
}`;

const STYLES = [
  { value: "interface", label: "interface", title: "export interface Root { … }" },
  { value: "type", label: "type", title: "export type Root = { … };" },
] as const satisfies readonly { value: DeclarationStyle; label: string; title: string }[];

export function JsonToTsTool() {
  const [input, setInput] = useState("");
  const [rootName, setRootName] = useState("Root");
  const [declaration, setDeclaration] = useState<DeclarationStyle>("interface");

  const result = useMemo(
    () => jsonToTs(input, { rootName, declaration }),
    [input, rootName, declaration],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-muted">
          Root type name
          <input
            value={rootName}
            onChange={(e) => setRootName(e.target.value)}
            type="text"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="font-code h-8 w-40 rounded-md border border-border bg-background px-2.5 text-[13px] text-foreground placeholder:text-muted focus:outline-none"
          />
        </label>
        <Segmented
          label="Declaration style"
          options={STYLES}
          value={declaration}
          onChange={setDeclaration}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InputPanel
          value={input}
          onChange={setInput}
          title="JSON"
          placeholder="Paste a JSON sample here…"
          sample={SAMPLE}
          minRows={18}
        />
        <OutputPanel
          title="TypeScript"
          value={result.ok ? result.value : ""}
          error={result.ok ? null : result.error}
          minRows={18}
        />
      </div>
    </div>
  );
}
