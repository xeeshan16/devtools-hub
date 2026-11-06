import { err, ok, type ToolResult } from "./result";

export type LoremUnit = "paragraphs" | "sentences" | "words";

export type LoremOptions = {
  unit: LoremUnit;
  count: number;
  /** Open with the traditional "Lorem ipsum dolor sit amet…" instead of random words. */
  startWithLorem: boolean;
};

export const DEFAULT_LOREM_OPTIONS: LoremOptions = {
  unit: "paragraphs",
  count: 3,
  startWithLorem: true,
};

/** Upper bounds keep a mistyped count from freezing the tab with megabytes of text. */
export const LOREM_MAX_COUNT: Record<LoremUnit, number> = {
  paragraphs: 100,
  sentences: 500,
  words: 5000,
};

/** The opening sentence designers recognise, kept verbatim. */
const CLASSIC_OPENING = "Lorem ipsum dolor sit amet, consectetur adipiscing elit".split(" ");

/**
 * The customary filler vocabulary: the scrambled Latin of the classic passage
 * plus its usual extensions. Words are drawn from it uniformly.
 */
const WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
  "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
  "velit", "esse", "cillum", "eu", "fugiat", "nulla", "pariatur", "excepteur",
  "sint", "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui",
  "officia", "deserunt", "mollit", "anim", "id", "est", "laborum", "vitae",
  "integer", "porta", "mauris", "nunc", "felis", "turpis", "curabitur", "lacus",
  "morbi", "tristique", "senectus", "netus", "fames", "egestas", "pellentesque",
  "habitant", "auctor", "sapien", "pretium", "viverra", "accumsan", "lectus",
  "faucibus", "ornare", "suspendisse", "potenti", "vel", "quam", "elementum",
];

const SENTENCE_WORDS = { min: 6, max: 14 };
const PARAGRAPH_SENTENCES = { min: 4, max: 7 };

/** A random source returning floats in [0, 1), like Math.random. Injectable for tests. */
export type RandomSource = () => number;

function randomInt(random: RandomSource, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function randomWord(random: RandomSource): string {
  return WORDS[Math.floor(random() * WORDS.length)];
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Builds one random sentence. Long sentences get a comma away from either end
 * so the rhythm looks like prose rather than a word list.
 */
function randomSentence(random: RandomSource): string {
  const words = Array.from(
    { length: randomInt(random, SENTENCE_WORDS.min, SENTENCE_WORDS.max) },
    () => randomWord(random),
  );
  if (words.length >= 10) {
    words[randomInt(random, 3, words.length - 4)] += ",";
  }
  return capitalize(words.join(" ")) + ".";
}

function sentences(count: number, random: RandomSource, startWithLorem: boolean): string[] {
  return Array.from({ length: count }, (_, i) =>
    i === 0 && startWithLorem ? CLASSIC_OPENING.join(" ") + "." : randomSentence(random),
  );
}

function words(count: number, random: RandomSource, startWithLorem: boolean): string {
  const opening = startWithLorem
    ? CLASSIC_OPENING.slice(0, count).map((w) => w.toLowerCase().replace(",", ""))
    : [];
  const rest = Array.from({ length: count - opening.length }, () => randomWord(random));
  const list = [...opening, ...rest];
  if (list.length > 0) list[0] = capitalize(list[0]);
  return list.join(" ");
}

/**
 * Generates placeholder text as whole paragraphs, sentences or an exact number
 * of words. Paragraphs are separated by a blank line.
 */
export function generateLorem(
  options: LoremOptions,
  random: RandomSource = Math.random,
): ToolResult<string> {
  const { unit, count, startWithLorem } = options;
  const max = LOREM_MAX_COUNT[unit];

  if (!Number.isInteger(count) || count < 1) {
    return err(`Enter a whole number of ${unit} of at least 1.`);
  }
  if (count > max) {
    return err(`Up to ${max.toLocaleString("en-US")} ${unit} at a time.`);
  }

  if (unit === "words") return ok(words(count, random, startWithLorem));
  if (unit === "sentences") return ok(sentences(count, random, startWithLorem).join(" "));

  const paragraphs = Array.from({ length: count }, (_, i) =>
    sentences(
      randomInt(random, PARAGRAPH_SENTENCES.min, PARAGRAPH_SENTENCES.max),
      random,
      i === 0 && startWithLorem,
    ).join(" "),
  );
  return ok(paragraphs.join("\n\n"));
}
