import type { ToolContent } from "@/content/types";

export const jsonFormatterContent: ToolContent = {
  howToUse: [
    "Paste or type JSON into the input panel on the left. The formatted result appears on the right as you type — there is no button to press and nothing is sent to a server.",
    "Pick an indentation style with the toggle above the output: two spaces, four spaces, tabs, or minify to strip every optional byte. Minified output is what you want for embedding JSON in an environment variable or a URL.",
    "If the JSON is invalid, the output panel shows the parser message together with the line and column where the problem starts, so you can jump straight to the offending character instead of counting brackets.",
    "When the JSON is valid, the footer summarises its shape: total keys, object and array counts, maximum nesting depth, and size in bytes.",
  ],
  examples: [
    {
      title: "Pretty-print a compact API response",
      note: "Two-space indentation, the most common convention.",
      input: '{"id":42,"tags":["a","b"],"ok":true}',
      output: `{
  "id": 42,
  "tags": [
    "a",
    "b"
  ],
  "ok": true
}`,
    },
    {
      title: "Minify before embedding",
      note: "Removes all insignificant whitespace.",
      input: `{
  "region": "us-east-1",
  "retries": 3
}`,
      output: '{"region":"us-east-1","retries":3}',
    },
    {
      title: "Locate a syntax error",
      note: "Trailing commas are valid JavaScript but invalid JSON.",
      input: `{
  "a": 1,
}`,
      output: "Unexpected token } in JSON (line 3, column 1)",
    },
  ],
  faq: [
    {
      question: "Is my JSON uploaded to a server?",
      answer:
        "No. Formatting and validation run entirely in your browser using the built-in JSON parser. Nothing you paste is transmitted, logged or stored, which makes the tool safe for configuration files and API responses that contain credentials.",
    },
    {
      question: "Why does my JSON fail to parse when it works in JavaScript?",
      answer:
        "JSON is stricter than JavaScript object syntax. Keys must be double-quoted, strings cannot use single quotes, trailing commas are not allowed, comments are not permitted, and values like NaN, Infinity and undefined are invalid. Any of these will produce a parse error here even though a JavaScript engine would accept them.",
    },
    {
      question: "What is the difference between formatting and minifying?",
      answer:
        "Formatting adds newlines and indentation so the structure is readable by a human. Minifying removes every byte that the parser does not need, producing the smallest valid representation. Both describe exactly the same data — only the whitespace differs.",
    },
    {
      question: "Does formatting change my data?",
      answer:
        "The values are preserved, but two things are normalised: object keys keep insertion order while duplicate keys collapse to the last occurrence, and numbers are re-serialised in their shortest round-trip form, so 1.0 becomes 1 and 1e3 becomes 1000.",
    },
    {
      question: "Is there a size limit?",
      answer:
        "There is no hard limit, but because the work happens in your browser tab, very large documents — tens of megabytes — will feel sluggish while typing. For files that size, a command-line tool such as jq is a better fit.",
    },
  ],
};
