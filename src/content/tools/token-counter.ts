import type { ToolContent } from "@/content/types";

export const tokenCounterContent: ToolContent = {
  howToUse: [
    "Paste text into the panel and pick a model family. The token count, word count and the tokens-per-word ratio all update as you type.",
    "GPT-4/GPT-3.5 and GPT-4o are counted with the real tokenizer OpenAI publishes — the same library the OpenAI API itself uses — so those counts are exact, not estimated.",
    "Claude and Gemini get a visually distinct grey Estimate badge instead of the green Exact one. Neither Anthropic nor Google publishes an offline tokenizer, so there is no way to count exactly in a browser tab — both use a ~4-characters-per-token approximation instead, and the badge says so rather than presenting a guess as a fact.",
    "The first time you select a GPT model, there is a brief 'Counting…' state while the tokenizer's data downloads — it is cached afterward, so switching back and forth is instant for the rest of the session.",
  ],
  examples: [
    {
      title: "A short sentence, GPT-4",
      note: "Exact count from the real cl100k_base tokenizer.",
      input: "The quick brown fox jumps over the lazy dog.",
      output: "10 tokens · 9 words · ~1.11 tokens per word",
    },
    {
      title: "Accented text, GPT-4 vs GPT-4o",
      note: "GPT-4o's larger vocabulary handles accented words far more efficiently.",
      input: "The señor café münster naïve résumé.",
      output: "GPT-4: 13 tokens (2.17/word) · GPT-4o: 9 tokens (1.50/word)",
    },
    {
      title: "The first sentence again, Claude (estimate)",
      note: "No public tokenizer exists, so this is length-based, not exact.",
      input: "The quick brown fox jumps over the lazy dog.",
      output: "~11 tokens (estimate) · 9 words",
    },
  ],
  faq: [
    {
      question: "Why are GPT counts exact but Claude and Gemini are only estimates?",
      answer:
        "OpenAI publishes the exact rank tables its tokenizer uses, in a library called tiktoken — this tool uses a pure-JavaScript port of it, so GPT-4 and GPT-4o counts are byte-for-byte what the OpenAI API would report. Anthropic and Google have not published an equivalent offline tokenizer for Claude or Gemini, so there is no way to count their tokens exactly outside of calling their API — which this tool deliberately does not do, since that would mean uploading your text.",
    },
    {
      question: "How accurate is the estimate for Claude and Gemini?",
      answer:
        "It uses roughly 4 characters per token, a rule of thumb that holds reasonably well for everyday English prose but drifts further from the true count for code, non-English text, or text with lots of punctuation and whitespace. Treat it as a ballpark for sizing a prompt against a context window, not as a number to build a hard limit on.",
    },
    {
      question: "Is my text uploaded anywhere to count tokens?",
      answer:
        "No, for any model. The GPT tokenizer runs entirely in your browser using the same rank data OpenAI publishes; the Claude and Gemini estimate is a simple length calculation. Nothing you paste is sent to OpenAI, Anthropic, Google, or anywhere else.",
    },
    {
      question: "Why does GPT-4 and GPT-4o give a different count for identical text?",
      answer:
        "They use different tokenizers — GPT-4 and GPT-3.5 use an encoding called cl100k_base, while GPT-4o and newer models use a newer one called o200k_base with a larger vocabulary. A larger vocabulary generally means common words are more likely to be a single token instead of being split, which is why GPT-4o often reports a slightly lower count on the same text.",
    },
  ],
};
