/**
 * Average adult rates from Brysbaert (2019), "How many words do we read per
 * minute? A review and meta-analysis of reading rate": 238 words per minute
 * for silent reading of non-fiction and 183 for reading aloud. They are
 * averages for English, so times derived from them are estimates.
 */
export const READING_WPM = 238;
export const SPEAKING_WPM = 183;

export type TextStats = {
  /** User-perceived characters (grapheme clusters): 👍🏽 and é are one each. */
  characters: number;
  /** Characters that are not whitespace. */
  charactersNoSpaces: number;
  /** UTF-16 code units: JavaScript's `length` and what HTML `maxlength` counts. */
  codeUnits: number;
  /** Size of the text encoded as UTF-8. */
  bytes: number;
  words: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  /** Estimated silent reading time at {@link READING_WPM}, in whole seconds. */
  readingSeconds: number;
  /** Estimated speaking time at {@link SPEAKING_WPM}, in whole seconds. */
  speakingSeconds: number;
};

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const wordSegmenter = new Intl.Segmenter(undefined, { granularity: "word" });
const sentenceSegmenter = new Intl.Segmenter(undefined, { granularity: "sentence" });
const encoder = new TextEncoder();

const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const WHITESPACE_ONLY = /^\s+$/u;
const BLANK_LINE = /(?:\r\n|\r|\n)[^\S\r\n]*(?:\r\n|\r|\n)/;

// Scripts written without spaces between words. A whitespace split would
// count a whole Chinese or Thai sentence as one word, so these runs go
// through the locale-aware word segmenter instead.
const UNSPACED_SCRIPT =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;

/**
 * Counts words the way word processors do for spaced languages: a run of
 * non-whitespace containing at least one letter or digit is one word, so
 * "well-known" and "don't" are one word each and a stray "—" is none.
 * Runs in unspaced scripts are split with Intl.Segmenter, whose dictionary
 * segmentation depends on the browser's ICU data.
 */
export function countWords(text: string): number {
  let count = 0;
  for (const token of text.split(/\s+/u)) {
    if (!token) continue;
    if (UNSPACED_SCRIPT.test(token)) {
      for (const segment of wordSegmenter.segment(token)) {
        if (segment.isWordLike) count += 1;
      }
    } else if (HAS_LETTER_OR_DIGIT.test(token)) {
      count += 1;
    }
  }
  return count;
}

/**
 * Sentences come from Intl.Segmenter's sentence boundaries, keeping only
 * segments with a letter or digit so trailing punctuation or a lone emoji
 * is not counted. The segmenter treats every line break as a boundary, which
 * would turn each line of hard-wrapped text into a sentence, so single line
 * breaks are joined with a space first; blank lines still end a sentence.
 * Abbreviations such as "e.g." followed by a capital letter can be split, so
 * treat the result as close rather than exact.
 */
export function countSentences(text: string): number {
  let count = 0;
  for (const paragraph of text.split(BLANK_LINE)) {
    const joined = paragraph.replace(/\r\n|\r|\n/g, " ");
    for (const { segment } of sentenceSegmenter.segment(joined)) {
      if (HAS_LETTER_OR_DIGIT.test(segment)) count += 1;
    }
  }
  return count;
}

/** Blocks of text separated by one or more blank (or whitespace-only) lines. */
export function countParagraphs(text: string): number {
  return text.split(/\r\n|\r|\n/).reduce(
    (state, line) => {
      const blank = line.trim() === "";
      if (!blank && !state.inParagraph) state.count += 1;
      state.inParagraph = !blank;
      return state;
    },
    { count: 0, inParagraph: false },
  ).count;
}

/**
 * Lines as an editor shows them. A single trailing newline ends the last line
 * rather than starting an empty one, matching how files are usually saved.
 */
export function countLines(text: string): number {
  if (text === "") return 0;
  const lines = text.split(/\r\n|\r|\n/).length;
  return /(\r\n|\r|\n)$/.test(text) ? lines - 1 : lines;
}

export function textStats(text: string): TextStats {
  let characters = 0;
  let charactersNoSpaces = 0;
  for (const { segment } of graphemes.segment(text)) {
    characters += 1;
    if (!WHITESPACE_ONLY.test(segment)) charactersNoSpaces += 1;
  }

  const words = countWords(text);
  return {
    characters,
    charactersNoSpaces,
    codeUnits: text.length,
    bytes: encoder.encode(text).length,
    words,
    sentences: countSentences(text),
    paragraphs: countParagraphs(text),
    lines: countLines(text),
    readingSeconds: Math.round((words / READING_WPM) * 60),
    speakingSeconds: Math.round((words / SPEAKING_WPM) * 60),
  };
}

/** Short human duration: "0 sec", "45 sec", "3 min 12 sec", "1 h 5 min". */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds} sec`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
  const rest = seconds % 60;
  return rest > 0 ? `${minutes} min ${rest} sec` : `${minutes} min`;
}
