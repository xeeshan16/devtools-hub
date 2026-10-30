import {
  ArrowDownAZ,
  Binary,
  Braces,
  CalendarClock,
  Calculator,
  CaseSensitive,
  Clock,
  CodeXml,
  FileJson,
  FileLock,
  FileSignature,
  FileType,
  Fingerprint,
  Globe,
  GitCompare,
  HardDrive,
  Hourglass,
  Hash,
  KeyRound,
  Link2,
  ListTree,
  Network,
  Palette,
  Quote,
  RectangleEllipsis,
  Regex,
  ScanSearch,
  Sheet,
  ShieldCheck,
  Tags,
  Terminal,
  type LucideIcon,
} from "lucide-react";

export const TOOL_CATEGORIES = [
  "Formatting",
  "Encoding",
  "Generators",
  "Text & Data",
  "AI Tools",
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
    related: ["yaml-json-converter", "base64-encoder-decoder", "jwt-decoder", "csv-json-converter", "json-to-typescript", "json-escape-unescape", "curl-to-fetch"],
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
    related: ["jwt-decoder", "json-formatter", "uuid-generator", "url-encoder-decoder", "hash-generator", "number-base-converter", "html-entity-encoder-decoder", "json-escape-unescape"],
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
    related: ["cron-parser", "uuid-generator", "jwt-decoder", "number-base-converter", "http-status-codes", "iso-duration-converter"],
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
    related: ["base64-encoder-decoder", "json-formatter", "jwt-encoder", "http-status-codes"],
    phase: 2,
  },
  {
    slug: "jwt-encoder",
    name: "JWT Encoder",
    seoTitle: "JWT Encoder — Sign a JSON Web Token Online",
    tagline: "Build and sign a JSON Web Token with HS256/384/512",
    description:
      "Build and sign a JSON Web Token with HS256, HS384 or HS512. An educational and testing tool — signing runs in your browser, but never paste a real production secret.",
    category: "Encoding",
    icon: FileSignature,
    keywords: ["jwt", "encode", "sign", "json web token", "hs256", "hmac", "generate token"],
    related: ["jwt-decoder", "base64-encoder-decoder", "json-formatter", "hash-generator"],
    phase: 3,
  },
  {
    slug: "url-encoder-decoder",
    name: "URL Encoder / Decoder",
    seoTitle: "URL Encoder & Decoder — Percent-Encoding Online",
    tagline: "Percent-encode and decode URLs and query strings",
    description:
      "Percent-encode text for a URL or decode it back, as a single component or a full URL, with form (+) encoding and clear errors for malformed escapes.",
    category: "Encoding",
    icon: Link2,
    keywords: ["url", "percent encoding", "urlencode", "urldecode", "encodeURIComponent", "query string", "escape"],
    related: ["base64-encoder-decoder", "jwt-decoder", "json-formatter", "html-entity-encoder-decoder", "url-parser", "json-escape-unescape", "unicode-inspector"],
    phase: 3,
  },
  {
    slug: "html-entity-encoder-decoder",
    name: "HTML Entity Encoder / Decoder",
    seoTitle: "HTML Entity Encoder & Decoder — Escape HTML Online",
    tagline: "Escape and unescape HTML entities",
    description:
      "Escape text for HTML or decode entities like &amp;, &eacute; and &#x1F600; back to characters, with named, decimal or hex output. Runs in your browser.",
    category: "Encoding",
    icon: CodeXml,
    keywords: ["html", "entities", "escape", "unescape", "html encode", "html decode", "character reference", "&amp;", "xss"],
    related: ["url-encoder-decoder", "base64-encoder-decoder", "json-formatter", "color-converter", "url-parser", "json-escape-unescape", "unicode-inspector"],
    phase: 3,
  },
  {
    slug: "hash-generator",
    name: "Hash Generator",
    seoTitle: "SHA-256 Hash Generator — SHA-1, SHA-384, SHA-512",
    tagline: "Generate and verify SHA-1, SHA-256, SHA-384 and SHA-512 hashes",
    description:
      "Generate SHA-1, SHA-256, SHA-384 and SHA-512 hashes of any text in hex or Base64, and verify a known checksum. Runs entirely in your browser.",
    category: "Generators",
    icon: ShieldCheck,
    keywords: ["hash", "sha256", "sha-256", "sha1", "sha512", "checksum", "digest", "sri", "integrity"],
    related: ["base64-encoder-decoder", "password-generator", "jwt-encoder", "number-base-converter"],
    phase: 3,
  },
  {
    slug: "number-base-converter",
    name: "Number Base Converter",
    seoTitle: "Number Base Converter — Binary, Hex, Octal, Decimal",
    tagline: "Convert integers between binary, octal, decimal and hex",
    description:
      "Convert integers of any size between binary, octal, decimal and hexadecimal, with 0x/0b prefixes, digit grouping and the smallest int type that fits.",
    category: "Encoding",
    icon: Calculator,
    keywords: ["binary", "hex", "hexadecimal", "octal", "decimal", "radix", "base converter", "bigint"],
    related: ["base64-encoder-decoder", "hash-generator", "timestamp-converter", "color-converter", "chmod-calculator", "subnet-calculator", "data-size-converter"],
    phase: 3,
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
    related: ["json-formatter", "timestamp-converter", "cron-parser", "url-parser", "semver-checker", "http-status-codes"],
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
    related: ["timestamp-converter", "regex-tester", "yaml-json-converter", "chmod-calculator", "iso-duration-converter"],
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
    related: ["json-formatter", "cron-parser", "base64-encoder-decoder", "csv-json-converter", "json-to-typescript"],
    phase: 2,
  },
  {
    slug: "csv-json-converter",
    name: "CSV ⇄ JSON Converter",
    seoTitle: "CSV to JSON Converter (and Back) — Free Online",
    tagline: "Convert between CSV and JSON",
    description:
      "Convert CSV to JSON or JSON to CSV, with quoted fields, custom delimiters and line-numbered errors. Runs entirely in your browser.",
    category: "Formatting",
    icon: Sheet,
    keywords: ["csv", "json", "tsv", "convert", "spreadsheet", "excel", "rfc 4180", "comma separated"],
    related: ["json-formatter", "yaml-json-converter", "diff-checker", "sort-lines"],
    phase: 3,
  },
  {
    slug: "diff-checker",
    name: "Diff Checker",
    seoTitle: "Diff Checker — Compare Text Line by Line or Word by Word",
    tagline: "Compare two blocks of text and highlight what changed",
    description:
      "Compare two blocks of text and see exactly what changed, line by line or word by word, with additions and deletions highlighted. Runs entirely in your browser.",
    category: "Text & Data",
    icon: GitCompare,
    keywords: ["diff", "compare", "text compare", "changes", "line diff", "word diff"],
    related: ["regex-tester", "case-converter", "json-formatter", "csv-json-converter", "sort-lines", "semver-checker", "unicode-inspector"],
    phase: 3,
  },
  {
    slug: "password-generator",
    name: "Password Generator",
    seoTitle: "Password Generator — Strong, Random & Free",
    tagline: "Generate strong random passwords with an entropy meter",
    description:
      "Generate a strong, random password with adjustable length and character types, plus a strength meter based on real entropy. Runs entirely in your browser.",
    category: "Generators",
    icon: RectangleEllipsis,
    keywords: ["password", "generator", "random", "strong password", "entropy", "secure"],
    related: ["uuid-generator", "jwt-decoder", "base64-encoder-decoder", "hash-generator"],
    phase: 3,
  },
  {
    slug: "token-counter",
    name: "Token Counter",
    seoTitle: "Token Counter — GPT, Claude & Gemini, Free",
    tagline: "Count tokens for GPT, Claude and Gemini prompts",
    description:
      "Count tokens in a prompt for GPT-4, GPT-4o, Claude and Gemini. GPT counts use the real tokenizer; Claude and Gemini are clearly labeled estimates.",
    category: "AI Tools",
    icon: Hash,
    keywords: ["tokens", "tokenizer", "gpt", "claude", "gemini", "tiktoken", "prompt", "context window"],
    related: ["case-converter", "regex-tester", "diff-checker", "unicode-inspector"],
    phase: 3,
  },
  {
    slug: "case-converter",
    name: "Case Converter",
    seoTitle: "Case Converter — camelCase, snake_case, kebab-case & More",
    tagline: "Convert text between camelCase, snake_case and more",
    description:
      "Convert text or an identifier between UPPERCASE, lowercase, Title Case, Sentence case, camelCase, PascalCase, snake_case and kebab-case, all at once.",
    category: "Text & Data",
    icon: CaseSensitive,
    keywords: ["case", "camelcase", "snake case", "kebab case", "pascalcase", "title case", "convert"],
    related: ["json-formatter", "regex-tester", "yaml-json-converter", "color-converter", "sort-lines", "json-to-typescript"],
    phase: 3,
  },
  {
    slug: "color-converter",
    name: "Color Converter",
    seoTitle: "Color Converter — HEX, RGB & HSL with Contrast Check",
    tagline: "Convert between HEX, RGB and HSL and check contrast",
    description:
      "Convert colors between HEX, RGB and HSL, with alpha, and check WCAG contrast against white and black. Runs entirely in your browser.",
    category: "Text & Data",
    icon: Palette,
    keywords: ["color", "colour", "hex", "rgb", "rgba", "hsl", "css color", "contrast", "wcag", "accessibility"],
    related: ["number-base-converter", "html-entity-encoder-decoder", "case-converter"],
    phase: 3,
  },
  {
    slug: "chmod-calculator",
    name: "Chmod Calculator",
    seoTitle: "Chmod Calculator — Octal & rwx Permissions, Free",
    tagline: "Convert Unix permissions between octal and rwx",
    description:
      "Convert Unix file permissions between octal (755) and symbolic (rwxr-xr-x) form, toggle bits in a grid, and copy the chmod command. Runs in your browser.",
    category: "Text & Data",
    icon: FileLock,
    keywords: ["chmod", "permissions", "unix", "linux", "octal", "rwx", "file mode", "setuid", "sticky bit", "ls -l"],
    related: ["number-base-converter", "cron-parser", "subnet-calculator"],
    phase: 3,
  },
  {
    slug: "url-parser",
    name: "URL Parser",
    seoTitle: "URL Parser — Split a URL & Decode Query Params",
    tagline: "Break a URL into parts and decode its query string",
    description:
      "Split any URL into scheme, host, port, path, query parameters and fragment, with decoded values and the default port filled in. Runs in your browser.",
    category: "Encoding",
    icon: ListTree,
    keywords: ["url", "parse", "query string", "query parameters", "hostname", "port", "path", "fragment", "uri", "new URL"],
    related: ["url-encoder-decoder", "html-entity-encoder-decoder", "regex-tester", "subnet-calculator", "http-status-codes", "curl-to-fetch"],
    phase: 3,
  },
  {
    slug: "subnet-calculator",
    name: "Subnet Calculator",
    seoTitle: "IPv4 Subnet Calculator — CIDR, Netmask & Host Range",
    tagline: "Work out the network, broadcast and host range of a CIDR block",
    description:
      "Calculate an IPv4 subnet from CIDR or a netmask: network and broadcast address, first and last host, host count, wildcard mask and binary. Runs in your browser.",
    category: "Text & Data",
    icon: Network,
    keywords: ["subnet", "cidr", "ipv4", "ip address", "netmask", "subnet mask", "wildcard mask", "broadcast", "network address", "host range", "prefix"],
    related: ["number-base-converter", "url-parser", "chmod-calculator", "data-size-converter"],
    phase: 3,
  },
  {
    slug: "sort-lines",
    name: "Sort & Dedupe Lines",
    seoTitle: "Sort Lines & Remove Duplicate Lines — Online, Free",
    tagline: "Sort lines and remove duplicates, blanks and stray whitespace",
    description:
      "Sort lines alphabetically, naturally, by length or in reverse, and remove duplicate and blank lines, with case and whitespace options. Runs in your browser.",
    category: "Text & Data",
    icon: ArrowDownAZ,
    keywords: ["sort", "sort lines", "remove duplicates", "dedupe", "unique", "uniq", "duplicate lines", "blank lines", "natural sort", "alphabetize", "list"],
    related: ["diff-checker", "case-converter", "csv-json-converter", "regex-tester", "semver-checker"],
    phase: 3,
  },
  {
    slug: "json-to-typescript",
    name: "JSON to TypeScript",
    seoTitle: "JSON to TypeScript — Generate Interfaces Online",
    tagline: "Generate TypeScript interfaces and types from JSON",
    description:
      "Paste JSON and get TypeScript interfaces or type aliases, with nested types, optional fields and unions inferred from the sample. Runs in your browser.",
    category: "Formatting",
    icon: FileType,
    keywords: ["typescript", "ts", "interface", "type", "json to ts", "json to interface", "types", "api response", "codegen", "quicktype"],
    related: ["json-formatter", "yaml-json-converter", "case-converter", "curl-to-fetch"],
    phase: 3,
  },
  {
    slug: "json-escape-unescape",
    name: "JSON Escape / Unescape",
    seoTitle: "JSON Escape & Unescape — Online String Escaper",
    tagline: "Escape text for a JSON string or unescape it back",
    description:
      "Escape quotes, backslashes and line breaks for a JSON string, or unescape a stringified JSON payload back to text, with error positions. Runs in your browser.",
    category: "Encoding",
    icon: Quote,
    keywords: ["json escape", "json unescape", "escape string", "stringify", "backslash", "escaped json", "quotes", "escape sequences", "unicode escape", "string literal"],
    related: ["json-formatter", "html-entity-encoder-decoder", "url-encoder-decoder", "base64-encoder-decoder", "unicode-inspector"],
    phase: 3,
  },
  {
    slug: "semver-checker",
    name: "Semver Range Checker",
    seoTitle: "Semver Range Checker — Test npm Version Ranges Online",
    tagline: "See which versions a caret, tilde or x-range accepts",
    description:
      "Check which versions satisfy an npm semver range like ^1.2.3, ~2.1 or >=1 <3, see the range expanded, and sort versions by precedence. Runs in your browser.",
    category: "Text & Data",
    icon: Tags,
    keywords: ["semver", "semantic versioning", "version range", "caret", "tilde", "npm", "package.json", "dependency", "satisfies", "prerelease", "sort versions", "x-range"],
    related: ["sort-lines", "diff-checker", "regex-tester"],
    phase: 3,
  },
  {
    slug: "unicode-inspector",
    name: "Unicode Inspector",
    seoTitle: "Unicode Inspector — Find Invisible & Zero-Width Characters",
    tagline: "See every code point, find zero-width and hidden characters",
    description:
      "Break text into Unicode code points with names, UTF-8 and UTF-16 bytes and escapes, and find zero-width spaces, no-break spaces and other hidden characters.",
    category: "Text & Data",
    icon: ScanSearch,
    keywords: ["unicode", "code point", "zero width space", "invisible characters", "hidden characters", "utf-8", "utf-16", "nbsp", "bom", "emoji", "grapheme", "character inspector"],
    related: ["json-escape-unescape", "html-entity-encoder-decoder", "url-encoder-decoder", "diff-checker", "token-counter"],
    phase: 3,
  },
  {
    slug: "data-size-converter",
    name: "Data Size Converter",
    seoTitle: "Data Size Converter — Bytes, KB, MB, GB, KiB, MiB, GiB",
    tagline: "Convert between bytes, MB, GiB and bits, decimal and binary",
    description:
      "Convert data sizes between bytes, kB, MB, GB, TB, binary KiB, MiB, GiB and bits. Exact results, with MB vs MiB and MB vs Mb kept apart. Runs in your browser.",
    category: "Text & Data",
    icon: HardDrive,
    keywords: ["bytes", "kb", "mb", "gb", "tb", "kib", "mib", "gib", "megabits", "bits to bytes", "byte converter", "file size", "storage", "bandwidth", "iec", "binary prefix"],
    related: ["number-base-converter", "subnet-calculator", "timestamp-converter", "chmod-calculator", "iso-duration-converter"],
    phase: 3,
  },
  {
    slug: "http-status-codes",
    name: "HTTP Status Codes",
    seoTitle: "HTTP Status Codes — Lookup & Meaning of Every Code",
    tagline: "Look up what any HTTP status code means and when to use it",
    description:
      "Search every registered HTTP status code by number, class or name. Plain-English meanings, RFC 9110 names, old aliases and the spec for each code.",
    category: "Text & Data",
    icon: Globe,
    keywords: ["http", "status code", "response code", "404", "500", "403", "401", "429", "rfc 9110", "error code", "redirect", "rest api"],
    related: ["url-parser", "jwt-decoder", "timestamp-converter", "regex-tester", "curl-to-fetch"],
    phase: 3,
  },
  {
    slug: "curl-to-fetch",
    name: "cURL to Fetch Converter",
    seoTitle: "cURL to Fetch Converter — curl to JavaScript Online",
    tagline: "Turn a curl command into a JavaScript fetch call",
    description:
      "Convert curl commands to JavaScript fetch code: method, headers, JSON and form bodies, basic auth and timeouts, with notes on what fetch can't do. Runs in your browser.",
    category: "Formatting",
    icon: Terminal,
    keywords: ["curl", "fetch", "convert curl", "curl to javascript", "curl to js", "copy as curl", "http request", "api", "node fetch", "rest"],
    related: ["json-to-typescript", "url-parser", "http-status-codes", "json-formatter"],
    phase: 3,
  },
  {
    slug: "iso-duration-converter",
    name: "ISO 8601 Duration Converter",
    seoTitle: "ISO 8601 Duration Converter — PT1H30M to Seconds",
    tagline: "Parse ISO 8601 durations like P1DT2H into seconds and back",
    description:
      "Parse ISO 8601 durations such as PT1H30M or P1DT2H into components, plain English and exact totals in seconds, minutes and hours, or turn seconds into ISO.",
    category: "Text & Data",
    icon: Hourglass,
    keywords: ["iso 8601", "duration", "pt1h", "period", "xsd duration", "java duration", "youtube duration", "seconds to iso", "time span", "timespan"],
    related: ["timestamp-converter", "cron-parser", "data-size-converter"],
    phase: 3,
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
