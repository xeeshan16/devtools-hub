import {
  Binary,
  Braces,
  CalendarClock,
  Clock,
  FileJson,
  Fingerprint,
  KeyRound,
  Regex,
  type LucideIcon,
} from "lucide-react";

export const TOOL_CATEGORIES = [
  "Formatting",
  "Encoding",
  "Generators",
  "Text & Data",
] as const;

export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

export type Tool = {
  slug: string;
  /** Product name, used in headings and cards. */
  name: string;
  /** `<title>` text — written around the primary search term (design doc §6). */
  seoTitle: string;
  /** One line for cards and the command palette. */
  tagline: string;
  /** Meta description; ~150 characters. */
  description: string;
  category: ToolCategory;
  icon: LucideIcon;
  /** Extra command-palette search terms beyond the name and tagline. */
  keywords: string[];
  /** Slugs shown in the "Related tools" rail; kept bidirectional by convention. */
  related: string[];
  /** Launch phase from design doc §3 — drives sitemap priority only. */
  phase: 1 | 2 | 3;
};

export const TOOLS: Tool[] = [
  {
    slug: "json-formatter",
    name: "JSON Formatter",
    seoTitle: "JSON Formatter & Validator — Online, Free",
    tagline: "Format, validate and minify JSON",
    description:
      "Format, validate and minify JSON online. Pinpoints syntax errors by line and column. Runs entirely in your browser — your data is never uploaded.",
    category: "Formatting",
    icon: Braces,
    keywords: ["json", "beautify", "pretty print", "minify", "validate", "lint"],
    related: ["yaml-json-converter", "base64-encoder-decoder", "jwt-decoder"],
    phase: 1,
  },
  {
    slug: "base64-encoder-decoder",
    name: "Base64 Encoder / Decoder",
    seoTitle: "Base64 Encoder & Decoder — Online, Free",
    tagline: "Encode and decode Base64 and Base64URL",
    description:
      "Encode text to Base64 or decode it back, with full UTF-8 and URL-safe (Base64URL) support. Client-side only — nothing leaves your browser.",
    category: "Encoding",
    icon: Binary,
    keywords: ["base64", "base64url", "btoa", "atob", "encode", "decode"],
    related: ["jwt-decoder", "json-formatter", "uuid-generator"],
    phase: 1,
  },
  {
    slug: "uuid-generator",
    name: "UUID Generator",
    seoTitle: "UUID Generator — v4 & v7, Bulk, Free",
    tagline: "Generate and inspect UUIDs (v4, v7, nil)",
    description:
      "Generate cryptographically random UUID v4, time-sortable UUID v7, or the nil UUID — one at a time or in bulk — and inspect any UUID's version and variant.",
    category: "Generators",
    icon: Fingerprint,
    keywords: ["uuid", "guid", "v4", "v7", "random", "identifier", "bulk"],
    related: ["timestamp-converter", "base64-encoder-decoder", "json-formatter"],
    phase: 1,
  },
  {
    slug: "timestamp-converter",
    name: "Timestamp Converter",
    seoTitle: "Unix Timestamp Converter — Epoch to Date",
    tagline: "Convert Unix time to dates and back",
    description:
      "Convert Unix epoch timestamps to human-readable dates and back, in seconds or milliseconds, with ISO 8601, UTC, local time zone and relative-time output.",
    category: "Text & Data",
    icon: Clock,
    keywords: ["unix", "epoch", "timestamp", "date", "iso 8601", "utc", "time"],
    related: ["cron-parser", "uuid-generator", "jwt-decoder"],
    phase: 1,
  },
  {
    slug: "jwt-decoder",
    name: "JWT Decoder",
    seoTitle: "JWT Decoder — Inspect Token Header & Claims",
    tagline: "Decode and inspect JSON Web Tokens",
    description:
      "Decode a JSON Web Token to read its header, payload and registered claims, with expiry checking. Decoding happens in your browser — tokens are never sent anywhere.",
    category: "Encoding",
    icon: KeyRound,
    keywords: ["jwt", "json web token", "bearer", "claims", "exp", "auth"],
    related: ["base64-encoder-decoder", "json-formatter", "timestamp-converter"],
    phase: 2,
  },
  {
    slug: "regex-tester",
    name: "Regex Tester",
    seoTitle: "Regex Tester — Live JavaScript Regex Matching",
    tagline: "Test regular expressions with live match highlighting",
    description:
      "Test JavaScript regular expressions against sample text with live highlighting, capture-group breakdown, flag toggles and a replacement preview.",
    category: "Text & Data",
    icon: Regex,
    keywords: ["regex", "regexp", "regular expression", "match", "capture", "replace"],
    related: ["json-formatter", "timestamp-converter", "cron-parser"],
    phase: 2,
  },
  {
    slug: "cron-parser",
    name: "Cron Parser",
    seoTitle: "Cron Expression Parser — Plain English & Next Runs",
    tagline: "Explain cron expressions and preview next runs",
    description:
      "Translate a cron expression into plain English, break down each field, and preview the next scheduled run times in any time zone.",
    category: "Text & Data",
    icon: CalendarClock,
    keywords: ["cron", "crontab", "schedule", "expression", "next run", "quartz"],
    related: ["timestamp-converter", "regex-tester", "yaml-json-converter"],
    phase: 2,
  },
  {
    slug: "yaml-json-converter",
    name: "YAML ⇄ JSON Converter",
    seoTitle: "YAML to JSON Converter (and Back) — Free Online",
    tagline: "Convert between YAML and JSON",
    description:
      "Convert YAML to JSON or JSON to YAML in one click, with clear parse errors. Ideal for Kubernetes manifests, CI configs and OpenAPI documents.",
    category: "Formatting",
    icon: FileJson,
    keywords: ["yaml", "yml", "json", "convert", "kubernetes", "openapi"],
    related: ["json-formatter", "cron-parser", "base64-encoder-decoder"],
    phase: 2,
  },
];

export const TOOLS_BY_SLUG: Record<string, Tool> = Object.fromEntries(
  TOOLS.map((tool) => [tool.slug, tool]),
);

export function getTool(slug: string): Tool {
  const tool = TOOLS_BY_SLUG[slug];
  // A missing slug is always a build-time authoring mistake, never user input.
  if (!tool) throw new Error(`Unknown tool slug: ${slug}`);
  return tool;
}

export function relatedTools(slug: string): Tool[] {
  return getTool(slug)
    .related.map((s) => TOOLS_BY_SLUG[s])
    .filter((t): t is Tool => Boolean(t));
}

export function toolsByCategory(): { category: ToolCategory; tools: Tool[] }[] {
  return TOOL_CATEGORIES.map((category) => ({
    category,
    tools: TOOLS.filter((tool) => tool.category === category),
  })).filter((group) => group.tools.length > 0);
}

export function toolPath(slug: string): string {
  return `/tools/${slug}`;
}
