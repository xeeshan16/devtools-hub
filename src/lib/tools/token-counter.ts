import { Tiktoken } from "js-tiktoken";

export type GptModel = "gpt-4" | "gpt-4o";
export type ModelFamily = GptModel | "claude" | "gemini";

/**
 * `exact: true` means this is a real tokenizer, not an approximation — OpenAI
 * publishes the BPE rank tables js-tiktoken uses, so GPT counts here are
 * identical to what the OpenAI API would report. Neither Anthropic nor
 * Google publishes an offline tokenizer, so Claude and Gemini can only ever
 * be estimated client-side; the UI must label those results as such rather
 * than presenting them with the same confidence as the GPT count.
 */
export const MODELS: { id: ModelFamily; label: string; exact: boolean }[] = [
  { id: "gpt-4", label: "GPT-4 / GPT-3.5", exact: true },
  { id: "gpt-4o", label: "GPT-4o", exact: true },
  { id: "claude", label: "Claude", exact: false },
  { id: "gemini", label: "Gemini", exact: false },
];

const ENCODING_NAME: Record<GptModel, "cl100k_base" | "o200k_base"> = {
  "gpt-4": "cl100k_base",
  "gpt-4o": "o200k_base",
};

// Building a Tiktoken instance parses a multi-hundred-thousand-entry rank
// table, so the constructed encoder is cached — every tool on this site
// recomputes on each keystroke, and rebuilding this from scratch each time
// would make that pattern noticeably janky here.
const encoderCache = new Map<string, Tiktoken>();

// Split into two functions with one unconditional dynamic import apiece —
// a single function with both `import()` calls behind a ternary led the
// bundler to merge both multi-megabyte rank tables into one shared chunk,
// so selecting either model downloaded both. Isolating each import at its
// own call site is what actually gets them split apart.
async function loadCl100kRanks() {
  return (await import("js-tiktoken/ranks/cl100k_base")).default;
}

async function loadO200kRanks() {
  return (await import("js-tiktoken/ranks/o200k_base")).default;
}

async function loadEncoder(model: GptModel): Promise<Tiktoken> {
  const encodingName = ENCODING_NAME[model];
  const cached = encoderCache.get(encodingName);
  if (cached) return cached;

  const ranks =
    encodingName === "cl100k_base" ? await loadCl100kRanks() : await loadO200kRanks();

  const encoder = new Tiktoken(ranks);
  encoderCache.set(encodingName, encoder);
  return encoder;
}

/**
 * ~4 characters per token is the commonly-cited rule of thumb for English
 * text across modern BPE tokenizers (OpenAI states it in their own docs).
 * This is deliberately the same heuristic for Claude and Gemini — there is
 * no public offline tokenizer for either, so a more specific-looking number
 * would be false precision, not a better estimate.
 */
const ESTIMATE_CHARS_PER_TOKEN = 4;

export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / ESTIMATE_CHARS_PER_TOKEN);
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export type TokenCount = { tokens: number; exact: boolean };

export async function countTokens(text: string, model: ModelFamily): Promise<TokenCount> {
  const isGpt = model === "gpt-4" || model === "gpt-4o";

  if (!text) return { tokens: 0, exact: isGpt };

  if (isGpt) {
    const encoder = await loadEncoder(model);
    return { tokens: encoder.encode(text).length, exact: true };
  }

  return { tokens: estimateTokenCount(text), exact: false };
}
