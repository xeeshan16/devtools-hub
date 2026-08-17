import { err, ok, type ToolResult } from "./result";

export type DiffOp = "equal" | "add" | "remove";
export type DiffPart = { type: DiffOp; value: string };

/** Above this many tokens, diffing is skipped so a huge paste can't lock the tab. */
export const DIFF_TOKEN_LIMIT = 4000;

/**
 * Myers' O(ND) diff — the standard minimal-edit-script algorithm (Myers,
 * 1986; this follows the "greedy" formulation popularised by James Coglan's
 * walkthrough). Operates on generic string tokens so the same function backs
 * both line-level and word-level diffing; only the tokenizer differs.
 */
export function diffTokens(a: string[], b: string[]): DiffPart[] {
  const n = a.length;
  const m = b.length;
  if (n === 0 && m === 0) return [];

  const max = n + m;
  const offset = max;
  const size = 2 * max + 1;
  const v = new Int32Array(size);
  const trace: Int32Array[] = [];

  let foundAt = -1;
  outer: for (let d = 0; d <= max; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[k - 1 + offset] < v[k + 1 + offset])) {
        x = v[k + 1 + offset];
      } else {
        x = v[k - 1 + offset] + 1;
      }
      let y = x - k;

      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }

      v[k + offset] = x;

      if (x >= n && y >= m) {
        foundAt = d;
        break outer;
      }
    }
  }

  type Step = { type: DiffOp; aIndex: number; bIndex: number };
  const steps: Step[] = [];
  let x = n;
  let y = m;

  for (let d = foundAt; d > 0; d--) {
    const vPrev = trace[d];
    const k = x - y;
    const prevK =
      k === -d || (k !== d && vPrev[k - 1 + offset] < vPrev[k + 1 + offset])
        ? k + 1
        : k - 1;

    const prevX = vPrev[prevK + offset];
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      steps.push({ type: "equal", aIndex: x - 1, bIndex: y - 1 });
      x--;
      y--;
    }

    if (x === prevX) {
      steps.push({ type: "add", aIndex: -1, bIndex: y - 1 });
    } else {
      steps.push({ type: "remove", aIndex: x - 1, bIndex: -1 });
    }

    x = prevX;
    y = prevY;
  }

  while (x > 0 && y > 0) {
    steps.push({ type: "equal", aIndex: x - 1, bIndex: y - 1 });
    x--;
    y--;
  }

  steps.reverse();

  // Adjacent equal tokens land as separate steps; merging keeps the output
  // one part per run instead of one part per token.
  const parts: DiffPart[] = [];
  for (const step of steps) {
    const value = step.type === "add" ? b[step.bIndex] : a[step.aIndex];
    const last = parts[parts.length - 1];
    if (last && last.type === step.type) {
      last.value += value;
    } else {
      parts.push({ type: step.type, value });
    }
  }
  return parts;
}

function tokenizeLines(input: string): string[] {
  if (input === "") return [];
  // Keep the newline on each token so joined output round-trips exactly,
  // including a trailing blank line.
  return input.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

function tokenizeWords(input: string): string[] {
  if (input === "") return [];
  // Keep whitespace runs as their own tokens for the same round-trip reason.
  return input.match(/\s+|\S+/g) ?? [];
}

export type DiffMode = "line" | "word";

export function diffText(a: string, b: string, mode: DiffMode): ToolResult<DiffPart[]> {
  const tokenize = mode === "line" ? tokenizeLines : tokenizeWords;
  const aTokens = tokenize(a);
  const bTokens = tokenize(b);

  if (aTokens.length + bTokens.length > DIFF_TOKEN_LIMIT) {
    return err(
      `Too much text to diff at once (over ${DIFF_TOKEN_LIMIT.toLocaleString()} ${mode === "line" ? "lines" : "words"} combined). Try a smaller excerpt, or switch to line mode if you're in word mode.`,
    );
  }

  return ok(diffTokens(aTokens, bTokens));
}

export type DiffStats = { additions: number; deletions: number; unchanged: number };

/** A newline-terminated run counts each line; a trailing partial line still counts as one. */
function lineCount(value: string): number {
  return (value.match(/\n/g)?.length ?? 0) + (value.endsWith("\n") ? 0 : 1);
}

/**
 * A run in word mode is the concatenation of several original word and
 * whitespace tokens — counting runs instead of words would silently
 * undercount a multi-word insertion like "No sign-up required." as one.
 */
function wordCount(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function diffStats(parts: DiffPart[], mode: DiffMode): DiffStats {
  const stats: DiffStats = { additions: 0, deletions: 0, unchanged: 0 };
  for (const part of parts) {
    const amount = mode === "line" ? lineCount(part.value) : wordCount(part.value);
    if (part.type === "add") stats.additions += amount;
    else if (part.type === "remove") stats.deletions += amount;
    else stats.unchanged += amount;
  }
  return stats;
}
