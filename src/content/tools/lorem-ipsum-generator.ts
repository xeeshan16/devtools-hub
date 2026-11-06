import type { ToolContent } from "@/content/types";

export const loremIpsumGeneratorContent: ToolContent = {
  howToUse: [
    "Choose how much text you need — a number of paragraphs, sentences or an exact number of words — and the placeholder text appears straight away. Press Regenerate for a different random variation.",
    "Keep \"Start with Lorem ipsum dolor sit amet\" switched on for the familiar opening that tells reviewers the copy is a placeholder, or turn it off to get fully random text.",
    "Use Words when a layout has a fixed budget, such as a 12-word card title or a 50-word excerpt: the output always contains exactly that many words. Copy the result with the button in the panel header.",
  ],
  examples: [
    {
      title: "Five words with the classic opening",
      note: "Exact word counts suit headings, buttons and card titles.",
      input: "Count: 5 · Unit: Words",
      output: "Lorem ipsum dolor sit amet",
    },
    {
      title: "One sentence with the classic opening",
      note: "The first sentence is the traditional one; later sentences are random.",
      input: "Count: 1 · Unit: Sentences",
      output: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    },
    {
      title: "Paragraphs",
      note: "Each paragraph has four to seven sentences, separated by a blank line.",
      input: "Count: 2 · Unit: Paragraphs",
      output:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Tempor magna culpa ut aliqua veniam…\n\nNostrud officia, laboris ex commodo velit esse cillum…",
    },
  ],
  faq: [
    {
      question: "What is lorem ipsum?",
      answer:
        "Lorem ipsum is scrambled Latin used as placeholder text in design and typesetting. It is derived from a passage of Cicero's De finibus bonorum et malorum, with words cut and rearranged so it looks like natural prose without being readable, which keeps reviewers focused on layout instead of content.",
    },
    {
      question: "Why use placeholder text instead of real copy?",
      answer:
        "Real copy is often not written yet when a page is designed, and readable text pulls attention away from spacing, typography and hierarchy. Lorem ipsum has a realistic mix of word lengths, so it fills a layout the way real text will while obviously not being final.",
    },
    {
      question: "Is the output different each time?",
      answer:
        "Yes. Words are picked at random from the usual lorem ipsum vocabulary, and sentence and paragraph lengths vary within a natural range. Press Regenerate for a new variation. The classic opening, when switched on, is always the same.",
    },
    {
      question: "Is anything sent to a server?",
      answer:
        "No. The text is generated in your browser with plain JavaScript. Nothing is requested from or sent to a server, so the tool also works offline once the page has loaded.",
    },
    {
      question: "How much text can I generate at once?",
      answer:
        "Up to 100 paragraphs, 500 sentences or 5,000 words per generation. The limits keep a mistyped number from freezing the page; generate again if you need more.",
    },
  ],
};
