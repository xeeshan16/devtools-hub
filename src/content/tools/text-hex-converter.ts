import type { ToolContent } from "@/content/types";

export const textHexContent: ToolContent = {
  howToUse: [
    "Choose Text → Hex to see the UTF-8 bytes of any text written as hexadecimal, or Hex → Text to turn a hex dump back into readable text. The result updates as you type, entirely in your browser.",
    "When encoding, pick the layout you need: a continuous run as used in hash digests, bytes separated by spaces or colons, a 0x byte array for C, Java or JavaScript, or \\x escapes for a string literal. Turn on Uppercase for A-F instead of a-f.",
    "When decoding, paste hex in any of those layouts. Spaces, line breaks, colons, commas, dashes, array brackets, 0x prefixes and \\x escapes are all understood. A character that is not hex, an odd number of digits, or bytes that are not valid UTF-8 are reported with their position.",
  ],
  examples: [
    {
      title: "Text to hex",
      note: "Each ASCII character is one byte. é is two bytes in UTF-8.",
      input: "Café",
      output: "43 61 66 c3 a9",
    },
    {
      title: "Hex dump back to text",
      note: "Separators and prefixes are ignored, so a C byte array decodes as is.",
      input: "{0x48, 0x69, 0x21}",
      output: "Hi!",
    },
    {
      title: "Emoji as a string escape",
      note: "An emoji outside the Basic Multilingual Plane takes four UTF-8 bytes.",
      input: "😀",
      output: "\\xf0\\x9f\\x98\\x80",
    },
  ],
  faq: [
    {
      question: "Is my text uploaded anywhere?",
      answer:
        "No. Encoding and decoding run in your browser with plain JavaScript. Nothing you paste is sent, logged or stored, so it is safe to paste payloads, log lines or configuration.",
    },
    {
      question: "Which character encoding does this use?",
      answer:
        "UTF-8, the encoding of the web, JSON and nearly every modern API. ASCII characters are one byte each, so they look the same as in older single-byte encodings, while accented letters take two bytes and emoji four. Decoding also expects UTF-8 and tells you if the bytes are not valid UTF-8.",
    },
    {
      question: "Why do I get \"is not valid UTF-8\" when decoding?",
      answer:
        "The bytes do not form UTF-8 text. That usually means they are binary data, such as a hash, a key or a compressed payload, or text in a different encoding such as Latin-1 or UTF-16. The error names the first byte that does not fit, counting from 1.",
    },
    {
      question: "Why does decoding say I have an odd number of hex digits?",
      answer:
        "Every byte is exactly two hex digits, so the total must be even. A missing or extra digit somewhere is the usual cause. If your source writes small bytes without a leading zero, such as 0x5, pad them to two digits (05) first.",
    },
    {
      question: "How is this different from the Number Base Converter?",
      answer:
        "The Number Base Converter treats its input as one number and changes its base, so hex 41 becomes decimal 65. This tool treats hex as a sequence of bytes and reads them as text, so hex 41 becomes the letter A.",
    },
  ],
};
