import type { ToolContent } from "@/content/types";

export const diffCheckerContent: ToolContent = {
  howToUse: [
    "Paste the original text into Before and the changed version into After. The diff below updates as you type — there is no compare button.",
    "Line mode is the default and reads like a standard unified diff: removed lines are marked with a red minus, added lines with a green plus, and everything else is shown unchanged.",
    "Switch to Word mode with the toggle above the diff to see exactly which words changed inside a line, instead of the whole line being marked as removed-and-re-added.",
    "The count in the footer — additions, deletions, unchanged — updates for whichever mode is active, so switching modes also changes what a line or a word counts as.",
  ],
  examples: [
    {
      title: "A single word changed",
      note: "Word mode isolates the one word that actually changed.",
      input: "Fast, reliable developer tools.",
      output: "Fast, [-reliable-][+private+] developer tools.",
    },
    {
      title: "A line added at the end",
      note: "Line mode shows the whole new line, not just the word difference.",
      input: "Built for daily use.\nRuns in your browser.",
      output: "Built for daily use.\nRuns entirely in your browser.\n+No sign-up required.",
    },
    {
      title: "Identical input",
      note: "No differences means every line is shown unchanged, nothing highlighted.",
      input: "Same text\nSame text",
      output: "0 additions, 0 deletions, 2 unchanged",
    },
  ],
  faq: [
    {
      question: "Is my text uploaded anywhere to compute the diff?",
      answer:
        "No. The diff is computed entirely in your browser using a standard minimal-edit-script algorithm (the same family of algorithm behind git diff). Nothing you paste into either panel is transmitted, logged or stored, so it is safe to compare real config files, code, or confidential drafts.",
    },
    {
      question: "What is the difference between Line mode and Word mode?",
      answer:
        "Line mode compares whole lines: if one word in a long line changes, the entire line is marked as removed and the new version added. Word mode compares individual words instead, so a one-word change is highlighted as just that word, with the rest of the line shown unchanged.",
    },
    {
      question: "How does the tool decide what counts as an addition versus a change?",
      answer:
        "There is no separate 'changed' category — a change is represented the same way a human reads a diff: the old line or word is shown as a deletion immediately followed by the new one as an addition. Seeing both next to each other communicates the change without a third color to interpret.",
    },
    {
      question: "Is there a limit on how much text I can compare?",
      answer:
        "Diffing is skipped above a few thousand lines or words combined, with a message explaining why, so an extremely large paste can't lock up the tab. For most files — source code, config, logs, prose — this ceiling is well beyond what you would ever compare in a browser tab.",
    },
  ],
};
