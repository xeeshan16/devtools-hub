import type { ToolContent } from "@/content/types";

export const yamlJsonContent: ToolContent = {
  howToUse: [
    "Choose a direction — YAML to JSON or JSON to YAML — then paste your document into the input panel. The converted result appears on the right as you type.",
    "Parse errors are reported with the message from the underlying parser, including the line where the problem was found, so a mis-indented key is quick to locate.",
    "Swap moves the output back into the input and reverses the direction, which is a fast way to normalise a messy document: convert it out and straight back in.",
    "This is the tool for Kubernetes manifests, GitHub Actions workflows, Docker Compose files and OpenAPI specifications — anywhere a schema is documented in one format but your tooling wants the other.",
  ],
  examples: [
    {
      title: "YAML to JSON",
      note: "Nested mappings become nested objects.",
      input: `name: web
ports:
  - 80
  - 443`,
      output: `{
  "name": "web",
  "ports": [
    80,
    443
  ]
}`,
    },
    {
      title: "JSON to YAML",
      note: "Block style, two-space indentation.",
      input: '{"on":{"push":{"branches":["main"]}}}',
      output: `on:
  push:
    branches:
      - main`,
    },
    {
      title: "Multi-line strings",
      note: "A literal block scalar keeps newlines intact.",
      input: `script: |
  npm ci
  npm test`,
      output: '{"script":"npm ci\\nnpm test\\n"}',
    },
  ],
  faq: [
    {
      question: "Is every YAML document convertible to JSON?",
      answer:
        "Almost, but not quite. YAML is a superset of JSON, so the reverse direction always works. Going the other way fails for YAML features JSON has no equivalent for: non-string mapping keys, anchors that create circular references, explicit tags, and multi-document files separated by three hyphens.",
    },
    {
      question: "What happens to comments?",
      answer:
        "They are lost. JSON has no comment syntax, so YAML comments disappear on conversion and cannot be recovered by converting back. Keep the commented original if it is the file you maintain by hand.",
    },
    {
      question: "Why did my YAML value become a boolean or a number?",
      answer:
        "YAML infers types from unquoted scalars, so yes, no, on, off and true all become booleans, and a value like 1.0 or 0755 becomes a number. Version strings and country codes are the usual casualties — the fix is to quote them, so write \"1.0\" and \"NO\" explicitly.",
    },
    {
      question: "Are anchors and aliases supported?",
      answer:
        "They are resolved during parsing, so the JSON output contains the fully expanded value wherever an alias appeared. Converting back to YAML writes the value out in full each time rather than re-creating the anchor, since a duplicated literal is easier to read than a reference in a copy-paste tool.",
    },
    {
      question: "Does the tool preserve key order?",
      answer:
        "Yes. Keys are emitted in the order they appear in the source document in both directions. Nothing is sorted or reordered, so a converted Kubernetes manifest keeps apiVersion and kind at the top where you expect them.",
    },
  ],
};
