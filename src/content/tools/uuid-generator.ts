import type { ToolContent } from "@/content/types";

export const uuidGeneratorContent: ToolContent = {
  howToUse: [
    "Pick a version and a count, then read the identifiers straight off the list — a new batch is generated the moment the page loads and every time you change an option.",
    "Choose v4 for general-purpose random identifiers, v7 when the identifiers will become database keys and you want them to sort by creation time, or Nil for the all-zero placeholder UUID.",
    "Copy a single value with the button on its row, or copy the whole batch with the button in the panel header. Batches of up to 1000 are supported.",
    "Paste any UUID into the inspector on the right to read back which version produced it, which variant it declares, and — for v7 — the exact moment it was created.",
  ],
  examples: [
    {
      title: "UUID v4 (random)",
      note: "The 13th hex digit is the version; the 17th encodes the variant.",
      input: "Version: v4",
      output: "f81d4fae-7dec-41d0-a765-00a0c91e6bf6",
    },
    {
      title: "UUID v7 (time-ordered)",
      note: "The first 48 bits are a Unix timestamp in milliseconds.",
      input: "Version: v7",
      output: "018f0a1b-2c3d-7e4f-8a9b-0c1d2e3f4a5b",
    },
    {
      title: "Nil UUID",
      note: "A reserved placeholder meaning 'no value'.",
      input: "Version: Nil",
      output: "00000000-0000-0000-0000-000000000000",
    },
  ],
  faq: [
    {
      question: "Are these UUIDs safe to use in production?",
      answer:
        "Yes. They are generated in your browser with the Web Crypto API's cryptographically secure random number generator — the same source a server-side library would use — and they are never transmitted anywhere.",
    },
    {
      question: "Should I use UUID v4 or v7?",
      answer:
        "Use v7 for database primary keys. Because its leading bits are a timestamp, newly inserted rows land next to each other in the index instead of scattering across it, which avoids the write amplification and index fragmentation that random v4 keys cause. Use v4 when the identifier must reveal nothing at all about when it was created.",
    },
    {
      question: "Can two UUIDs ever collide?",
      answer:
        "In practice, no. A v4 UUID carries 122 random bits, so you would need to generate roughly a billion per second for about 85 years before a single collision became likely. UUID v7 combines a millisecond timestamp with 74 random bits, which makes a collision within the same millisecond similarly improbable.",
    },
    {
      question: "Does a UUID v7 leak information?",
      answer:
        "It reveals its own creation time to the millisecond, which the inspector on this page will show you. That is usually harmless and often useful, but if the creation time of a record is itself sensitive, use v4 instead.",
    },
    {
      question: "What is the difference between a UUID and a GUID?",
      answer:
        "Nothing meaningful. GUID is Microsoft's name for the same 128-bit identifier described by RFC 9562. The only thing to watch for is that some Microsoft tooling displays GUIDs wrapped in braces or with mixed-endian byte ordering in binary form.",
    },
  ],
};
