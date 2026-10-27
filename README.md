# DevTools Hub

[![CI](https://github.com/xeeshan16/devtools-hub/actions/workflows/ci.yml/badge.svg)](https://github.com/xeeshan16/devtools-hub/actions/workflows/ci.yml)

Fast, private developer utilities that run entirely in your browser. Paste a JWT, a config file or an API response and nothing is uploaded: every tool is plain client-side TypeScript.

**Live:** https://devtools-hub-sigma.vercel.app

## Tools

| Category | Tools |
| --- | --- |
| Formatting | JSON Formatter & Validator, YAML ⇄ JSON Converter, CSV ⇄ JSON Converter, JSON to TypeScript |
| Encoding | Base64 / Base64URL, URL Encoder / Decoder, URL Parser, HTML Entity Encoder / Decoder, JSON Escape / Unescape, JWT Decoder, JWT Encoder, Number Base Converter |
| Generators | UUID Generator (v4, v7), Password Generator, Hash Generator (SHA-1/256/384/512) |
| Text & Data | Timestamp Converter, Regex Tester, Cron Expression Parser, Case Converter, Diff Checker, Color Converter (HEX/RGB/HSL), Chmod Calculator, Subnet Calculator (IPv4 CIDR), Sort & Dedupe Lines, Semver Range Checker, Unicode Inspector, Data Size Converter (bytes, KB/KiB, bits) |
| AI Tools | Token Counter |

Every tool page also ships worked examples and an FAQ, which double as `FAQPage` structured data for search.

## Why it is built this way

- **Privacy by construction.** Tool logic lives in pure functions under `src/lib/tools/`. There is no API route that receives user input, so there is no server-side code path that could log it.
- **Logic separated from UI.** Each tool is a pure function with its own unit tests, wrapped by a thin React component. The interesting behaviour (parsing, encoding, error positions) is tested without a browser.
- **One registry drives everything.** `src/lib/tools/registry.ts` is the single source for names, SEO titles, categories, related tools, the sitemap and the command palette. A registry test fails if a tool is missing its route, its explainer content, or points at a related tool that doesn't exist.
- **Structured content, not MDX.** Examples and FAQs are typed data (`src/content/tools/`), so the rendered page and the JSON-LD can never drift apart.

## Project structure

```
src/
  app/                     Next.js App Router pages (one route per tool)
  components/
    tools/impl/            Tool UIs (thin wrappers around src/lib/tools)
    tools/                 Shared panels: input, output, copy button, shell
    layout/                Header, footer, theme, command palette (Ctrl/⌘ K)
    seo/                   JSON-LD structured data
  content/tools/           How-to text, examples and FAQs per tool
  lib/tools/               Pure tool logic + *.test.ts
  lib/site.ts              Site name, canonical URL, author
```

## Getting started

Requires Node.js 20 or newer.

```bash
npm ci
npm run dev        # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npx next typegen && npx tsc --noEmit` | Type check, including Next's generated route types |
| `npm run build` | Production build |

Copy `.env.example` to `.env.local` to override the canonical site URL, for example on preview deployments.

## Adding a tool

1. Write the logic as a pure function in `src/lib/tools/<name>.ts`, with tests next to it in `<name>.test.ts`.
2. Add the UI in `src/components/tools/impl/<Name>Tool.tsx`.
3. Register it in `src/lib/tools/registry.ts` and add its content in `src/content/tools/<slug>.ts`.
4. Create `src/app/tools/<slug>/page.tsx` (copy an existing one; it is four lines of wiring).
5. Run `npm test`. The registry test tells you if any of the wiring is missing.

## Continuous integration

GitHub Actions runs lint, type checking, the test suite and a production build on every push and pull request (`.github/workflows/ci.yml`).

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Vitest · deployed on Vercel.
