import type { ToolContent } from "@/content/types";

export const jsonEscapeContent: ToolContent = {
  howToUse: [
    "Choose Escape to turn text into something that can sit between the double quotes of a JSON string, or Unescape to turn an escaped string back into readable text. The result updates as you type, entirely in your browser.",
    "When escaping, quotes, backslashes, line breaks, tabs and other control characters are escaped. Turn on Wrap in quotes to get a complete JSON string literal, and Escape non-ASCII to write accented letters and emoji as \\uXXXX for systems that only accept ASCII.",
    "When unescaping, paste the string with or without its surrounding quotes. This is handy for JSON that was logged or stored as a string, such as {\\\"id\\\":1}. An invalid escape or an unescaped quote is reported with its line and column.",
  ],
  examples: [
    {
      title: "Escape text for a JSON string",
      note: "Quotes and backslashes are escaped, and the line break becomes \\n.",
      input: 'Path: "C:\\temp"\nDone',
      output: 'Path: \\"C:\\\\temp\\"\\nDone',
    },
    {
      title: "Unescape JSON that was logged as a string",
      note: "Paste it with or without the surrounding quotes. Run the result through the JSON Formatter to pretty-print it.",
      input: '"{\\"event\\":\\"login\\",\\"ok\\":true}"',
      output: '{"event":"login","ok":true}',
    },
    {
      title: "ASCII-only output",
      note: "With Escape non-ASCII on, é becomes \\u00e9 and an emoji becomes a surrogate pair.",
      input: "Café 😀",
      output: "Caf\\u00e9 \\ud83d\\ude00",
    },
  ],
  faq: [
    {
      question: "Is my text uploaded anywhere?",
      answer:
        "No. Escaping and unescaping run in your browser with plain JavaScript. Nothing you paste is sent, logged or stored, so it is safe to paste log lines, payloads or configuration.",
    },
    {
      question: "Which characters have to be escaped in a JSON string?",
      answer:
        "Only the double quote, the backslash and control characters below U+0020, such as line breaks and tabs. Everything else, including accented letters, emoji and the forward slash, may appear as is. This tool escapes exactly those characters by default, using the short forms \\n, \\t and so on where JSON has them and \\u00XX otherwise.",
    },
    {
      question: "Why does an emoji become two \\u escapes?",
      answer:
        "JSON's \\u escape holds one UTF-16 code unit, and characters outside the Basic Multilingual Plane, such as most emoji, need two of them: a surrogate pair. So 😀 is written as \\ud83d\\ude00. Any JSON parser joins the pair back into one character.",
    },
    {
      question: "Why do I get an \"Unescaped double quote\" error?",
      answer:
        "Inside a JSON string every double quote must be written as \\\". A bare quote usually means you pasted something that is not a string body, for example a whole JSON object rather than one escaped string, or two quoted strings side by side. The error shows the line and column of the first bare quote.",
    },
    {
      question: "Are raw line breaks allowed when unescaping?",
      answer:
        "Yes. Strict JSON forbids raw line breaks inside a string, but pasted text often wraps, so they are kept as they are rather than rejected. Escape sequences JSON does not define, such as \\x41 or \\', are still reported as errors.",
    },
  ],
};
