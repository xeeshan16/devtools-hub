"use client";

import { ArrowRightLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { InputPanel } from "@/components/tools/InputPanel";
import { OutputPanel } from "@/components/tools/OutputPanel";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { convert, type ConvertDirection } from "@/lib/tools/yaml-json";

const DIRECTIONS = [
  { value: "yaml-to-json", label: "YAML → JSON" },
  { value: "json-to-yaml", label: "JSON → YAML" },
] as const satisfies readonly { value: ConvertDirection; label: string }[];

const SAMPLES: Record<ConvertDirection, string> = {
  "yaml-to-json": `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  labels:
    app: web
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: web
          image: nginx:1.27
          ports:
            - containerPort: 80`,
  "json-to-yaml": `{
  "name": "ci",
  "on": { "push": { "branches": ["main"] } },
  "jobs": {
    "test": {
      "runs-on": "ubuntu-latest",
      "steps": [{ "uses": "actions/checkout@v4" }, { "run": "npm test" }]
    }
  }
}`,
};

export function YamlJsonTool() {
  const [input, setInput] = useState("");
  const [direction, setDirection] = useState<ConvertDirection>("yaml-to-json");

  const result = useMemo(() => convert(input, direction), [input, direction]);

  function swap() {
    if (result.ok && result.value) setInput(result.value);
    setDirection((d) =>
      d === "yaml-to-json" ? "json-to-yaml" : "yaml-to-json",
    );
  }

  const [inputLabel, outputLabel] =
    direction === "yaml-to-json" ? ["YAML", "JSON"] : ["JSON", "YAML"];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Conversion direction"
          options={DIRECTIONS}
          value={direction}
          onChange={setDirection}
        />
        <Button size="sm" variant="ghost" onClick={swap} className="ml-auto">
          <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden />
          Swap
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InputPanel
          value={input}
          onChange={setInput}
          title={inputLabel}
          placeholder={`Paste ${inputLabel} here…`}
          sample={SAMPLES[direction]}
          minRows={18}
        />
        <OutputPanel
          title={outputLabel}
          value={result.ok ? result.value : ""}
          error={result.ok ? null : result.error}
          minRows={18}
        />
      </div>
    </div>
  );
}
