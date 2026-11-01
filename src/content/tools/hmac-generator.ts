import type { ToolContent } from "@/content/types";

export const hmacGeneratorContent: ToolContent = {
  howToUse: [
    "Paste the message to sign and enter the shared secret key. The HMAC appears as you type, computed in your browser with the Web Crypto API.",
    "Pick the algorithm the other side uses: HMAC-SHA256 is by far the most common for webhooks and API request signing. Set the key format to Hex or Base64 if your secret is given as raw bytes rather than text.",
    "To check a webhook, paste the value of its signature header into Verify a signature. A prefix such as sha256= is ignored, as are surrounding whitespace and, for hex, letter case.",
    "The message is signed as UTF-8, byte for byte. Use the raw request body exactly as received: re-serialized JSON with different spacing or key order produces a completely different signature.",
  ],
  examples: [
    {
      title: "GitHub webhook signature",
      note: "HMAC-SHA256 with the secret \"It's a Secret to Everybody\", the example from GitHub's webhook documentation. GitHub sends it as sha256=<hex>.",
      input: "Hello, World!",
      output: "757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17",
    },
    {
      title: "RFC 4231 test case 2",
      note: "HMAC-SHA256 with the key \"Jefe\", a standard test vector for checking an implementation.",
      input: "what do ya want for nothing?",
      output: "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    },
    {
      title: "Base64 output",
      note: "The same signature in Base64, the form Shopify and some other webhook senders use.",
      input: "what do ya want for nothing?",
      output: "W9zBRr9gdU5qBCQmCJV1x1oAPwidJzmDnexYuWTsOEM=",
    },
  ],
  faq: [
    {
      question: "What is an HMAC?",
      answer:
        "A hash-based message authentication code (RFC 2104): a hash of the message mixed with a secret key. Anyone holding the key can recompute it to confirm the message was not altered and came from someone who knows the key. Unlike a plain SHA-256 hash, it cannot be forged without the key.",
    },
    {
      question: "Why doesn't my signature match the webhook's?",
      answer:
        "Usually the message differs by a few bytes. Sign the raw request body, not JSON that your framework parsed and re-serialized, and watch for trailing newlines. Some providers also sign more than the body, for example Stripe signs the timestamp, a dot and the body. Then check the algorithm, the output encoding (hex or Base64) and whether the secret is meant as text or as decoded Base64 bytes.",
    },
    {
      question: "Should the key be Text, Hex or Base64?",
      answer:
        "Use Text when the secret is used as typed, which is how most webhook secrets work. Choose Hex or Base64 only when the documentation says the key is the decoded bytes. Base64 here accepts both the standard and URL-safe alphabets, with or without padding.",
    },
    {
      question: "How should I compare signatures in my own code?",
      answer:
        "Use a constant-time comparison such as crypto.timingSafeEqual in Node, hmac.compare_digest in Python or hmac.Equal in Go. Comparing strings with == can leak how many leading characters matched through response timing.",
    },
    {
      question: "Is my secret sent anywhere?",
      answer:
        "No. Signing runs entirely in your browser through crypto.subtle; neither the message nor the key is uploaded. Even so, prefer a test secret over a live production one when experimenting.",
    },
  ],
};
