import type { ToolContent } from "@/content/types";

export const wordCounterContent: ToolContent = {
  howToUse: [
    "Type or paste any text and the counts update as you go: words, characters with and without spaces, sentences, paragraphs and lines. Everything is counted in your browser.",
    "Reading and speaking times are estimates based on average adult rates of 238 words per minute read silently and 183 words per minute read aloud, useful for sizing a blog post or timing a talk.",
    "For developers, the panel also shows the UTF-8 byte size, which is what a database column, an HTTP body or a file on disk holds, and the UTF-16 length, which is what JavaScript's .length and an HTML maxlength attribute count.",
  ],
  examples: [
    {
      title: "Words and characters",
      note: "A hyphenated word counts once. Only the two spaces are dropped from the count without spaces.",
      input: "A well-known fact.",
      output: "3 words · 18 characters · 16 without spaces · 1 sentence",
    },
    {
      title: "Emoji and accents",
      note: "Each reads as one character, but takes several bytes and UTF-16 units.",
      input: "Zoë 👍🏽",
      output: "5 characters · 13 UTF-8 bytes · 8 UTF-16 length",
    },
    {
      title: "Paragraphs and lines",
      note: "Paragraphs are separated by blank lines. A line break inside a paragraph does not end a sentence, but a blank line does.",
      input: "Intro line\nsecond line\n\nNew paragraph",
      output: "2 paragraphs · 4 lines · 6 words · 2 sentences",
    },
  ],
  faq: [
    {
      question: "Is my text uploaded anywhere?",
      answer:
        "No. All counting runs in your browser with plain JavaScript. Nothing you paste is sent, logged or stored, so drafts, essays and private notes stay on your device.",
    },
    {
      question: "How are words counted?",
      answer:
        "The same way most word processors count them: any run of characters between spaces or line breaks that contains a letter or digit is one word. That makes well-known and don't one word each, while a dash or bullet on its own is not a word. Chinese, Japanese, Thai and other languages written without spaces are split into words with your browser's built-in dictionary, so counts there can differ slightly between browsers.",
    },
    {
      question: "Why is the character count different from JavaScript's length?",
      answer:
        "Characters here are what a reader sees as one character. An emoji with a skin tone, a flag or an accented letter typed as two code points all count as one. JavaScript's length counts UTF-16 code units instead, so most emoji count as two or more. Both numbers are shown so you can check a limit either way.",
    },
    {
      question: "Where do the reading and speaking times come from?",
      answer:
        "From Marc Brysbaert's 2019 meta-analysis of reading rates, which found that adults read English non-fiction silently at about 238 words per minute and read aloud at about 183. Your own speed varies with the reader and the text, so treat the times as estimates.",
    },
    {
      question: "Why is the sentence count sometimes off by one?",
      answer:
        "Sentences are split at full stops, question marks and exclamation marks using your browser's sentence rules. An abbreviation such as e.g. or Dr. followed by a capital letter can look like the end of a sentence, so the count can be slightly high for text full of abbreviations.",
    },
  ],
};
