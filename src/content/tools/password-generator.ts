import type { ToolContent } from "@/content/types";

export const passwordGeneratorContent: ToolContent = {
  howToUse: [
    "Drag the length slider and tick the character types you want, then read the password straight off the panel — it regenerates automatically whenever an option changes.",
    "The bar underneath is the password's real entropy in bits, computed as length times log2 of the character pool size, not a canned label. The word above it — Weak, Fair, Strong, Very strong — is just a quick read of that same number.",
    "Turn on Exclude ambiguous characters to drop 0, O, 1, l and I from the pool, which matters when a password will be typed by hand or read aloud rather than pasted.",
    "Generation happens entirely in your browser using the Web Crypto API's cryptographically secure random number generator — the same source a server-side library would use. Nothing about the password you generate is transmitted, logged or stored anywhere; closing the tab is the only thing that ever needed to happen for it to be gone.",
  ],
  examples: [
    {
      title: "16 characters, letters and numbers",
      note: "A reasonable default for most account passwords.",
      input: "Length 16 · lower + upper + number",
      output: "≈ 62-character pool → 95.3 bits of entropy → Very strong",
    },
    {
      title: "Excluding ambiguous characters",
      note: "For a password someone will type from a printed slip.",
      input: "Length 12 · lower + upper + number · exclude ambiguous",
      output: "≈ 57-character pool → 70.0 bits of entropy → Strong",
    },
    {
      title: "A short PIN-style password",
      note: "Shows how quickly entropy drops with fewer character types and less length.",
      input: "Length 6 · number only",
      output: "10-character pool → 19.9 bits of entropy → Weak",
    },
  ],
  faq: [
    {
      question: "Is this password sent anywhere, or stored?",
      answer:
        "No. It is generated and displayed entirely in your browser using the Web Crypto API. Nothing is transmitted over the network, logged on a server, or saved to storage — the only copy that ever exists is the one on your screen, and it disappears when you regenerate or close the tab.",
    },
    {
      question: "How is the entropy number calculated?",
      answer:
        "It is length times log2 of the character pool size — the true worst-case brute-force keyspace of the password this tool generated, not an approximation. Because every character is drawn independently and uniformly at random from the full pool, that formula is exact, not an estimate rounded for display.",
    },
    {
      question: "Why does the strength meter cap out well before very long passwords?",
      answer:
        "The bar's scale saturates at 100 bits so it has visible headroom for typical lengths instead of every 40-character password looking identical at a pinned 100%. The exact bit count next to the label is always precise even when the bar itself is full.",
    },
    {
      question: "Should I exclude ambiguous characters?",
      answer:
        "Only if a human will ever need to type or read the password — printed on a card, read aloud over the phone, entered on a device without a password manager. If it will only ever be pasted from a password manager, leaving every character type enabled gives you a slightly larger pool and therefore more entropy for the same length.",
    },
  ],
};
