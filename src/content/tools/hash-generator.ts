import type { ToolContent } from "@/content/types";

export const hashGeneratorContent: ToolContent = {
  howToUse: [
    "Type or paste text into the input. Its SHA-1, SHA-256, SHA-384 and SHA-512 digests appear as you type, computed in your browser with the Web Crypto API.",
    "Choose Hex for the familiar form printed by sha256sum and most download pages, or Base64 for the shorter form used in Subresource Integrity attributes and some APIs. Tick Uppercase hex if the value you are comparing against is upper-case.",
    "To check a value, paste the expected digest into Verify against a known hash. The tool tells you which algorithm it matches, ignoring surrounding whitespace and, for hex, letter case.",
    "Text is hashed as UTF-8, byte for byte as typed. A trailing newline or space changes the digest completely.",
  ],
  examples: [
    {
      title: "SHA-256 of a sentence",
      note: "Hex output, as printed by sha256sum.",
      input: "The quick brown fox jumps over the lazy dog",
      output: "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
    },
    {
      title: "The FIPS 180 test vector",
      note: "SHA-1 of the three bytes \"abc\", the standard's own example.",
      input: "abc",
      output: "a9993e364706816aba3e25717850c26c9cd0d89d",
    },
    {
      title: "Base64 output",
      note: "The same SHA-256 digest of \"abc\" in the form an SRI integrity attribute uses after its sha256- prefix.",
      input: "abc",
      output: "ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=",
    },
  ],
  faq: [
    {
      question: "Why doesn't my hash match the one from the command line?",
      answer:
        "Almost always a trailing newline. echo text | sha256sum hashes the text plus a newline character; use echo -n or printf to leave it out. Check also that both sides use the same encoding (UTF-8 here) and that no spaces were copied along with the text.",
    },
    {
      question: "Which algorithm should I use?",
      answer:
        "SHA-256 is the sensible default for checksums and content identifiers. SHA-384 and SHA-512 offer a larger margin and are sometimes faster on 64-bit machines. SHA-1 is shown because older systems and Git still use it, but practical collisions have been demonstrated, so do not rely on it where an attacker could choose the input.",
    },
    {
      question: "Why is there no MD5?",
      answer:
        "The browser's Web Crypto API does not implement MD5, and this tool uses only the platform's own implementations rather than shipping hand-written cryptography. MD5 is also broken for collision resistance, so it should not be used for anything security-related.",
    },
    {
      question: "Can I hash passwords with this?",
      answer:
        "Not for storage. A fast general-purpose hash like SHA-256 lets an attacker test billions of guesses per second against a leaked database. Store passwords with a slow, salted password-hashing function such as Argon2id, scrypt or bcrypt.",
    },
    {
      question: "Is my text sent anywhere?",
      answer:
        "No. Hashing runs entirely in your browser through crypto.subtle.digest; nothing you type is uploaded.",
    },
  ],
};
