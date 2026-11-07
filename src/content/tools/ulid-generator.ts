import type { ToolContent } from "@/content/types";

export const ulidGeneratorContent: ToolContent = {
  howToUse: [
    "Set a count and read the identifiers straight off the list — a new batch is generated when the page loads and every time you change an option or press Regenerate.",
    "Leave Monotonic on to have every ULID in a batch share one timestamp and increase by one in its random part, so the batch sorts in exactly the order it was generated. Turn it off to draw fresh randomness for each one.",
    "Copy a single value with the button on its row, or the whole batch from the panel header. Batches of up to 1000 are supported.",
    "Paste any ULID into the inspector to read back when it was created, its 80-bit random component, and the same 128 bits formatted as a UUID for databases that store ULIDs in a uuid column.",
  ],
  examples: [
    {
      title: "Anatomy of a ULID",
      note: "Ten characters of millisecond timestamp, then sixteen of randomness.",
      input: "01ARYZ6S41TSV4RRFFQ69G5FAV",
      output: "Time 01ARYZ6S41 → 2016-07-30T22:36:16.385Z\nRandom TSV4RRFFQ69G5FAV",
    },
    {
      title: "Monotonic batch",
      note: "Same millisecond, random part incremented by one each time.",
      input: "Count: 3, Monotonic: on",
      output:
        "01JBX5M3Q8C6ZK2T9W4N7RHDFE\n01JBX5M3Q8C6ZK2T9W4N7RHDFF\n01JBX5M3Q8C6ZK2T9W4N7RHDFG",
    },
    {
      title: "ULID as a UUID",
      note: "The same 128 bits, written in hexadecimal.",
      input: "01ARYZ6S410000000000000001",
      output: "01563df3-6481-0000-0000-000000000001",
    },
  ],
  faq: [
    {
      question: "What is a ULID?",
      answer:
        "A ULID (Universally Unique Lexicographically Sortable Identifier) is a 128-bit identifier made of a 48-bit Unix timestamp in milliseconds followed by 80 random bits. It is written as 26 characters of Crockford Base32, which is shorter than a UUID, case-insensitive, and avoids the easily confused letters I, L, O and U.",
    },
    {
      question: "Should I use a ULID or a UUID v7?",
      answer:
        "Both put a millisecond timestamp first, so both sort by creation time and keep database indexes compact. UUID v7 is an IETF standard (RFC 9562) that fits native uuid columns and libraries directly; ULID has a shorter, URL-friendly text form. If your stack already speaks UUIDs, v7 is usually the simpler choice — and a ULID can always be stored as a UUID, as the inspector here shows.",
    },
    {
      question: "What does monotonic mode do?",
      answer:
        "Two ULIDs created in the same millisecond would otherwise compare in random order. In monotonic mode the generator keeps the timestamp and adds one to the previous random component instead, so IDs from the same millisecond still sort in the order they were made. The random part has 80 bits, so it cannot realistically run out.",
    },
    {
      question: "Are these ULIDs safe to use in production?",
      answer:
        "Yes. The random component comes from the Web Crypto API's cryptographically secure generator in your browser, and nothing is sent to a server. Like UUID v7, a ULID reveals its creation time to the millisecond, so avoid it where that timing is sensitive.",
    },
    {
      question: "Why is the first character never higher than 7?",
      answer:
        "Twenty-six Base32 characters hold 130 bits, but a ULID is only 128 bits, so the top two bits are always zero. That caps the first character at 7 and the largest timestamp at the year 10889 — the inspector rejects anything above it.",
    },
  ],
};
