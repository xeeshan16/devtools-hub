import type { ToolContent } from "@/content/types";

export const base64Content: ToolContent = {
  howToUse: [
    "Choose Encode to turn text into Base64, or Decode to read a Base64 string back as text. The conversion runs as you type, entirely in your browser.",
    "Tick URL-safe (Base64URL) when the value has to travel inside a URL, a filename or a JWT. That variant replaces the plus and slash characters with hyphen and underscore and drops the trailing equals-sign padding.",
    "Use Swap to feed the output back into the input with the direction reversed — the quickest way to confirm a value round-trips cleanly.",
    "Input is treated as UTF-8, so emoji, accented characters and non-Latin scripts all encode and decode correctly rather than throwing the range error the browser's raw btoa produces.",
  ],
  examples: [
    {
      title: "Encode text",
      note: "Standard Base64, with padding.",
      input: "devtools-hub",
      output: "ZGV2dG9vbHMtaHVi",
    },
    {
      title: "Encode for a URL",
      note: "URL-safe output: no +, / or = characters.",
      input: "subject?id=1&ok=true",
      output: "c3ViamVjdD9pZD0xJm9rPXRydWU",
    },
    {
      title: "Decode a credential header",
      note: "HTTP Basic auth encodes user:password.",
      input: "YWRtaW46czNjcmV0",
      output: "admin:s3cret",
    },
  ],
  faq: [
    {
      question: "Is Base64 a form of encryption?",
      answer:
        "No. Base64 is an encoding, not encryption. Anyone can decode it instantly without a key, exactly as this page does. Never use it to protect passwords, tokens or personal data — it only makes binary data safe to carry through text-only channels.",
    },
    {
      question: "What is the difference between Base64 and Base64URL?",
      answer:
        "They encode the same bytes with a different alphabet. Standard Base64 uses + and / for its last two characters and pads with =. Base64URL uses - and _ instead and usually omits the padding, because +, / and = all have reserved meanings inside URLs and would otherwise need percent-escaping.",
    },
    {
      question: "Why does Base64 make my data bigger?",
      answer:
        "Base64 represents every three bytes as four printable characters, so the encoded form is about 33 percent larger than the original, plus padding. That overhead is the price of being able to send arbitrary bytes through a text-only medium such as JSON, email or a URL.",
    },
    {
      question: "Why did my decode fail?",
      answer:
        "Two checks can fail. Either the string contains characters outside the Base64 alphabet or has a length that is not a valid multiple of four, or the bytes decode successfully but are not valid UTF-8 text — which happens when the original data was an image or another binary format rather than text.",
    },
    {
      question: "Can I encode a file or an image?",
      answer:
        "This tool works on text. To Base64-encode a binary file, use a command-line utility such as base64 on macOS and Linux, or certutil on Windows, then paste the resulting string here if you need to inspect or convert it to the URL-safe alphabet.",
    },
  ],
};
