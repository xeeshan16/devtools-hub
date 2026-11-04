import type { ToolContent } from "@/content/types";

export const slugGeneratorContent: ToolContent = {
  howToUse: [
    "Paste a title into the input panel and its slug appears on the right as you type. Paste several titles, one per line, to get one slug per line — blank lines are kept so the rows still line up with your list.",
    "Pick a separator: a hyphen is the usual choice for URLs, an underscore or dot suits file names and identifiers. Turn off Lowercase if the target system is case-sensitive and you want to keep capitals.",
    "Set a maximum length to keep paths short. Slugs are cut at the last whole word that fits, so a word is only split when the first word alone is longer than the limit.",
    "Letters with no ASCII equivalent, such as Chinese or Cyrillic characters, are removed and listed under the output, so nothing disappears without you noticing.",
  ],
  examples: [
    {
      title: "Blog post title",
      note: "Punctuation and spacing collapse into single hyphens.",
      input: "How to Deploy Next.js on Vercel",
      output: "how-to-deploy-next-js-on-vercel",
    },
    {
      title: "Accents and special letters",
      note: "Accents are stripped, ß becomes ss and & is spelled out.",
      input: "Straße & Café — Berlin",
      output: "strasse-and-cafe-berlin",
    },
    {
      title: "Apostrophes stay inside the word",
      note: "The word is not split into don and t.",
      input: "Don't Repeat Yourself",
      output: "dont-repeat-yourself",
    },
    {
      title: "Maximum length of 20",
      note: "Cut at the last whole word that fits.",
      input: "A Complete Guide to PostgreSQL Indexes",
      output: "a-complete-guide-to",
    },
  ],
  faq: [
    {
      question: "Is my text uploaded anywhere?",
      answer:
        "No. The slug is built in your browser with plain string operations. Nothing you paste is transmitted, logged or stored, so it is safe to use with unpublished titles or internal page names.",
    },
    {
      question: "How are accented letters handled?",
      answer:
        "The text is Unicode-normalized so that a letter like é splits into e plus a combining accent, and the accent is then removed. Letters that do not split that way, such as ß, æ, ø, ł and þ, are replaced with their usual Latin spelling: ss, ae, o, l and th.",
    },
    {
      question: "Why were some characters removed instead of converted?",
      answer:
        "Scripts like Chinese, Japanese, Arabic or Cyrillic have no single agreed Latin spelling, and guessing one would produce slugs that look right but read wrong. Those characters are removed and listed under the output so you can decide whether to write a Latin title yourself. Browsers and most servers also accept percent-encoded non-ASCII paths if you prefer to keep the original script.",
    },
    {
      question: "Should I use hyphens or underscores in URLs?",
      answer:
        "Hyphens. Google's URL guidelines recommend hyphens to separate words, because search engines treat a hyphen as a word break while an underscore can join words together. Underscores and dots are more useful for file names, database keys and identifiers.",
    },
    {
      question: "Why is everything lower-cased by default?",
      answer:
        "The path part of a URL is case-sensitive on most servers, so /My-Post and /my-post can be different pages. Lower-casing every slug avoids duplicate URLs and broken links when someone types an address by hand.",
    },
  ],
};
