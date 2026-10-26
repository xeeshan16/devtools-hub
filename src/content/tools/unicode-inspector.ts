import type { ToolContent } from "@/content/types";

export const unicodeInspectorContent: ToolContent = {
  howToUse: [
    "Paste the text you want to look inside: an identifier that won't match, a config value copied from a chat app or PDF, a CSV header with a stray byte order mark, or an emoji. Every code point is listed in order as you type.",
    "Each row shows the character, its U+ code point, its general category, its UTF-8 bytes and UTF-16 code units, an escape you can paste into JavaScript or JSON, and its offset in the string. Invisible characters and spaces other than the ordinary U+0020 are highlighted and named.",
    "Pick Hidden to list only the characters you can't see, or Non-ASCII to list everything above U+007F. A rule between rows marks where one user-perceived character ends and the next begins, so you can see which code points an emoji or accented letter is built from. Copy gives you the rows as tab-separated text for a bug report or spreadsheet.",
  ],
  examples: [
    {
      title: "Find a zero-width space in an identifier",
      note: "It reads as userid, but the U+200B after user means it never compares equal to the plain string.",
      input: "user\u200Bid",
      output: "U+200B  ZERO WIDTH SPACE  format  E2 80 8B  \\u200B  offset 4",
    },
    {
      title: "Spot a no-break space pasted from a document",
      note: "Word processors and web pages often use U+00A0 between words, which split(\" \") and many parsers do not treat as a space.",
      input: "max\u00A0connections",
      output: "U+00A0  NO-BREAK SPACE  space  C2 A0  \\u00A0  offset 3",
    },
    {
      title: "Take apart an emoji sequence",
      note: "One visible character, three code points joined by a zero width joiner: 5 UTF-16 units and 11 UTF-8 bytes.",
      input: "👩\u200D💻",
      output:
        "U+1F469  symbol  F0 9F 91 A9  \\u{1F469}\nU+200D  ZERO WIDTH JOINER  format  E2 80 8D  \\u200D\nU+1F4BB  symbol  F0 9F 92 BB  \\u{1F4BB}",
    },
  ],
  faq: [
    {
      question: "Is my text uploaded anywhere?",
      answer:
        "No. The text is broken into code points in your browser with plain JavaScript. Nothing you paste is sent, logged or stored.",
    },
    {
      question: "Which characters count as hidden?",
      answer:
        "Format characters such as the zero width space, zero width joiner, word joiner, soft hyphen, byte order mark and the bidirectional marks and overrides; every space character other than the ordinary U+0020, including the no-break, thin and ideographic spaces; control characters other than tab, line feed and carriage return; the Hangul filler letters, which render as blank space; and lone surrogates. Zero width joiners are also how emoji sequences are built, so check whether one sits inside an emoji before removing it.",
    },
    {
      question: "Why do the character, code point, UTF-16 and UTF-8 counts differ?",
      answer:
        "They measure different things. Characters counts grapheme clusters, what a reader sees as one character, so an accented letter written as e plus a combining accent, or a family emoji, counts once. Code points counts Unicode scalar values. UTF-16 units is what JavaScript's string length, Java and C# report, where anything above U+FFFF takes two units. UTF-8 bytes is the size on disk or on the wire, and what a database byte limit counts: 1 byte for ASCII, up to 4 for emoji.",
    },
    {
      question: "What is a lone surrogate?",
      answer:
        "Half of a UTF-16 surrogate pair without its other half, usually left behind when a string was cut in the middle of an emoji by slicing on UTF-16 units. It is not valid Unicode text: TextEncoder, most JSON encoders and databases replace it with U+FFFD, the replacement character, so it shows up in the table as invalid UTF-8.",
    },
    {
      question: "Why is a name shown for some characters but not others?",
      answer:
        "Names are shown for the characters that are hard to tell apart by eye: control characters, every kind of space, zero-width and bidirectional formatting characters, variation selectors, skin tone modifiers and the replacement characters. Letters, digits, punctuation and symbols are recognisable on screen, so for those the code point and category are shown instead of carrying the full Unicode name table to your browser.",
    },
  ],
};
