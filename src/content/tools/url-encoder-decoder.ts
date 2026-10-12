import type { ToolContent } from "@/content/types";

export const urlEncoderContent: ToolContent = {
  howToUse: [
    "Choose Encode to percent-encode text, or Decode to turn a percent-encoded string back into readable text. The conversion runs as you type, entirely in your browser.",
    "When encoding, pick Component for a single query value or path segment: every character with a special meaning in a URL, such as &, = and /, is escaped. Pick Full URL to encode a complete address while keeping the characters that give it structure.",
    "Tick Form encoding when you are working with HTML form data or query strings built that way: spaces become + on encode, and + is read as a space on decode.",
    "Text is treated as UTF-8, so accented letters and emoji become one escape per byte. If a decode fails, the error points at the position of the malformed escape.",
  ],
  examples: [
    {
      title: "Encode a query value",
      note: "Component scope escapes &, = and / so they cannot break the query string.",
      input: "name=Zoë & friends / 100% ✅",
      output: "name%3DZo%C3%AB%20%26%20friends%20%2F%20100%25%20%E2%9C%85",
    },
    {
      title: "Encode a full URL",
      note: "Full URL scope keeps :, /, ?, & and = intact.",
      input: "https://example.com/search?q=café au lait&page=2",
      output: "https://example.com/search?q=caf%C3%A9%20au%20lait&page=2",
    },
    {
      title: "Form encoding",
      note: "Spaces become +, and a literal + would become %2B.",
      input: "Zoë & Co",
      output: "Zo%C3%AB+%26+Co",
    },
  ],
  faq: [
    {
      question: "What is URL encoding?",
      answer:
        "URL encoding, also called percent-encoding, replaces characters that are not allowed or have a special meaning in a URL with a percent sign followed by two hexadecimal digits. A space becomes %20 and an ampersand becomes %26. Characters outside ASCII are first converted to UTF-8 bytes, and each byte is encoded separately.",
    },
    {
      question: "What is the difference between Component and Full URL encoding?",
      answer:
        "Component encoding matches JavaScript's encodeURIComponent and escapes every reserved character, which is right for a single query value or path segment. Full URL encoding matches encodeURI and leaves characters such as :, /, ?, #, & and = alone so that an entire address keeps working. Using Full URL on a query value is a common bug: an & inside the value would then split it into two parameters.",
    },
    {
      question: "Should a space be %20 or +?",
      answer:
        "Both appear in the wild. %20 is correct everywhere in a URL. The + form comes from HTML form submissions (application/x-www-form-urlencoded) and is only understood as a space in query strings. In a path, + is a literal plus sign. Use the Form encoding option when the data was produced by, or will be read by, a form-style parser.",
    },
    {
      question: "Why did my decode fail?",
      answer:
        "Either a percent sign is not followed by two hexadecimal digits, for example a bare 100% at the end of a string, or the escapes are well-formed but the bytes they describe are not valid UTF-8. A literal percent sign must itself be encoded as %25.",
    },
    {
      question: "Is URL encoding a way to hide data?",
      answer:
        "No. It is a reversible encoding with no key, so anyone can decode it instantly. Do not put passwords, tokens or personal data in a URL expecting encoding to protect them; URLs are routinely written to server logs and browser history.",
    },
  ],
};
