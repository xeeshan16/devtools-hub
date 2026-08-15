/**
 * Explainer content lives as typed data rather than MDX because the FAQ has to
 * serve two consumers at once: the rendered page and the `FAQPage` JSON-LD in
 * `ToolStructuredData`. Keeping it structured means the two can never drift.
 */
export type ToolExample = {
  title: string;
  /** Short note on what the example demonstrates. */
  note?: string;
  input: string;
  output: string;
};

export type ToolFaq = {
  question: string;
  /** Plain text — it is emitted verbatim into FAQPage structured data. */
  answer: string;
};

export type ToolContent = {
  /** 2–4 sentences, rendered under the tool (design doc §4.2). */
  howToUse: string[];
  examples: ToolExample[];
  faq: ToolFaq[];
};
