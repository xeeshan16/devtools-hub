import type { ToolContent } from "@/content/types";

export const base32Content: ToolContent = {
  howToUse: [
    "Choose Encode to turn text into Base32, or Decode to turn Base32 back into text. The result updates as you type, entirely in your browser.",
    "Pick the alphabet your system uses: RFC 4648 (A-Z and 2-7) for TOTP secrets and most libraries, Base32hex (0-9 and A-V) when encoded values must sort in the same order as the bytes, or Crockford for ULIDs and human-friendly codes. When encoding with RFC 4648 or Base32hex, untick Padding to drop the trailing = signs.",
    "When decoding, case, spaces, line breaks and missing padding are all accepted, and Crockford input may contain hyphens and the look-alike letters I, L and O. If the bytes are not UTF-8 text, as with a 2FA secret, they are shown as hex instead. A character outside the alphabet, data after the padding, an impossible length or the wrong amount of padding is reported with a specific message.",
  ],
  examples: [
    {
      title: "Text to Base32",
      note: "Three bytes become five characters, padded to eight with =.",
      input: "Hi!",
      output: "JBUSC===",
    },
    {
      title: "Decode a 2FA secret",
      note: "TOTP secrets are random bytes, so the result is shown as hex rather than text.",
      input: "JBSWY3DPEHPK3PXP",
      output: "48656c6c6f21deadbeef",
    },
    {
      title: "Base32hex and Crockford",
      note: "The same bytes in the two alternative alphabets. Crockford never pads.",
      input: "foobar",
      output: "CPNMUOJ1E8====== (Base32hex)\nCSQPYRK1E8 (Crockford)",
    },
  ],
  faq: [
    {
      question: "Is my data uploaded anywhere?",
      answer:
        "No. Encoding and decoding run in your browser with plain JavaScript. Nothing you paste is sent, logged or stored, which matters when the value is a 2FA secret or a key.",
    },
    {
      question: "What is the difference between RFC 4648, Base32hex and Crockford?",
      answer:
        "All three write five bits per character with 32 symbols. RFC 4648 Base32 uses A-Z then 2-7 and is what TOTP apps, onion addresses and most libraries expect. Base32hex uses 0-9 then A-V, so encoded strings sort in the same order as the original bytes. Crockford's alphabet leaves out I, L, O and U to avoid misreading, has no padding, and is the encoding used by ULIDs.",
    },
    {
      question: "Why is my decoded result shown as hex?",
      answer:
        "The decoded bytes are not valid UTF-8 text, so printing them as characters would only show garbage. This is expected for 2FA secrets, keys and hashes, which are random bytes. The hex output is the exact byte sequence, ready to use in code or compare with another tool.",
    },
    {
      question: "Why does decoding say the length cannot be decoded?",
      answer:
        "Base32 groups five bytes into eight characters, so a partial group can only be 2, 4, 5 or 7 characters long. A value that leaves 1, 3 or 6 characters after the last full group of eight cannot come from any input, which almost always means it was truncated or picked up an extra character while copying.",
    },
    {
      question: "How is Base32 different from Base64?",
      answer:
        "Base32 output is about 60% longer than the input, against about 33% for Base64, but it uses only one case of letters and digits and avoids symbols. That makes it safe in case-insensitive places such as DNS names and file systems, and easier to read aloud or type, which is why 2FA setup codes use it.",
    },
  ],
};
