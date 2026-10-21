import type { ToolContent } from "@/content/types";

export const sortLinesContent: ToolContent = {
  howToUse: [
    "Paste a list with one item per line: log lines, hostnames, package names, email addresses, a column copied from a spreadsheet. The result updates as you type.",
    "Pick an order. A–Z sorts alphabetically, Natural compares numbers by value so file2 comes before file10, Code point matches sort in the C locale, Length puts the shortest lines first, and Reverse flips the original order. Original keeps the order you pasted.",
    "Remove duplicates keeps the first occurrence of each line. Turn on Ignore case to treat Error and error as the same line, Trim whitespace to ignore leading and trailing spaces, and Remove blank lines to drop empty lines. The footer shows how many lines were removed.",
  ],
  examples: [
    {
      title: "Deduplicate and sort a list",
      note: "Repeated entries are dropped and the rest sorted A–Z.",
      input: "billing\nauth\nbilling\napi\nauth",
      output: "api\nauth\nbilling",
    },
    {
      title: "Natural order for numbered names",
      note: "Plain alphabetical order would put worker-10 before worker-2.",
      input: "worker-10\nworker-2\nworker-1",
      output: "worker-1\nworker-2\nworker-10",
    },
    {
      title: "Remove duplicates but keep the original order",
      note: "With the order set to Original, only repeats are removed.",
      input: "step 3\nstep 1\nstep 3\nstep 2",
      output: "step 3\nstep 1\nstep 2",
    },
  ],
  faq: [
    {
      question: "Is my text uploaded anywhere?",
      answer:
        "No. Sorting and deduplication run in your browser with plain JavaScript. Nothing you paste is sent, logged or stored, so it is safe to paste server names, customer IDs or log output.",
    },
    {
      question: "Which copy of a duplicate line is kept?",
      answer:
        "The first one. Later repeats are removed and the remaining lines are then sorted, so with the order set to Original you get your list back in the order you pasted it, minus the repeats. With Ignore case on, the first spelling wins: Error, error and ERROR become Error.",
    },
    {
      question: "What is the difference between A–Z, Natural and Code point order?",
      answer:
        "A–Z sorts the way a dictionary does: case is only a tie-breaker and accented letters sit next to their base letter, so école comes before zebra. Natural is the same but reads runs of digits as numbers, so item2 comes before item10. Code point compares raw character codes, like the sort command with LC_ALL=C or a default string sort in most programming languages: digits sort before capital letters, and all capital letters before lower case.",
    },
    {
      question: "Why are lines with trailing spaces not treated as duplicates?",
      answer:
        "Because they are different text, and the space can matter in some files. Turn on Trim whitespace to strip leading and trailing spaces and tabs from every line before duplicates are found and lines are sorted.",
    },
    {
      question: "Are Windows line endings kept?",
      answer:
        "Yes. Both LF and CRLF input are understood, and if the input uses CRLF the result does too. A trailing line break at the end of the input is kept as well.",
    },
  ],
};
