import type { ToolContent } from "@/content/types";

export const regexTesterContent: ToolContent = {
  howToUse: [
    "Type a pattern into the Pattern field — no surrounding slashes needed — and toggle the flags you want underneath it. An invalid pattern reports the engine's own error message immediately.",
    "Paste sample text into the Test string panel. Every match is highlighted in the panel beside it as you type, and the table below breaks out each match's position along with its numbered and named capture groups.",
    "Tick Enable under Replace to preview a substitution. Use dollar-one for the first numbered group and dollar-angle-bracket syntax for named groups.",
    "Matching uses your browser's own JavaScript regular expression engine, so what you see here is exactly what your JavaScript code will do — including its differences from PCRE, Python or Go.",
  ],
  examples: [
    {
      title: "Named capture groups",
      note: "Pattern: (?<user>[\\w.]+)@(?<domain>[\\w.]+\\.\\w{2,})",
      input: "alice@example.com",
      output: "user: alice, domain: example.com",
    },
    {
      title: "Global vs first match",
      note: "Without the g flag, matching stops at the first hit.",
      input: "order #10482, order #10483",
      output: "g on: 2 matches — g off: 1 match",
    },
    {
      title: "Replacement with a group reference",
      note: "Replacement: $<user> at $<domain>",
      input: "alice@example.com",
      output: "alice at example.com",
    },
  ],
  faq: [
    {
      question: "Which regex dialect does this use?",
      answer:
        "JavaScript's, as implemented by your browser. That matters: JavaScript has no atomic groups or possessive quantifiers, its lookbehind support is newer than most engines, and \\d matches only ASCII digits unless you add the u flag. Patterns copied from Python or PCRE documentation may need adjusting.",
    },
    {
      question: "What does each flag do?",
      answer:
        "g finds every match rather than stopping at the first. i ignores case. m makes the caret and dollar anchors match at line breaks instead of only at the start and end of the whole string. s lets the dot match newlines. u enables full Unicode handling including the \\p{...} property escapes. y anchors each attempt at the position where the previous match ended.",
    },
    {
      question: "Why does my pattern match nothing?",
      answer:
        "The three usual causes are backslashes lost when copying a pattern out of a quoted string in source code, the m flag missing when you rely on caret or dollar per line, and unescaped special characters — a literal dot, plus, question mark or parenthesis all need a preceding backslash.",
    },
    {
      question: "Is there a limit on the number of matches?",
      answer:
        "Matching stops after 5000 matches. A pattern with nested quantifiers can backtrack catastrophically and lock up the tab, so the ceiling exists to keep the page responsive. Zero-length matches are also advanced by one position each time, which prevents an infinite loop on patterns like an empty alternation.",
    },
    {
      question: "Is my test data sent anywhere?",
      answer:
        "No. The pattern and the test string stay in your browser; nothing is uploaded. You can safely test against real log lines or production samples.",
    },
  ],
};
