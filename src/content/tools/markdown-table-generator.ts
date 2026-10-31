import type { ToolContent } from "@/content/types";

export const markdownTableContent: ToolContent = {
  howToUse: [
    "Paste CSV, or select cells in a spreadsheet and paste them straight in. The first row becomes the table header and the Markdown table appears on the right as you type.",
    "The delimiter is detected from the first line: tabs (what spreadsheets put on the clipboard), then semicolons or commas. Pick one explicitly if the guess is wrong, for example a single-column list whose values contain commas.",
    "Choose a column alignment to add the `:---`, `:---:` or `---:` markers to the delimiter row. With \"Align columns in the source\" on, cells are padded so the raw Markdown reads as a grid; turn it off for the shortest output.",
    "Pipes inside a value are escaped and line breaks inside quoted fields become <br>, so the table renders correctly on GitHub, GitLab and most Markdown renderers.",
  ],
  examples: [
    {
      title: "CSV to a Markdown table",
      note: "The first row is the header; columns are padded to line up.",
      input: `id,name
1,Ada Lovelace
2,Grace`,
      output: `| id  | name         |
| --- | ------------ |
| 1   | Ada Lovelace |
| 2   | Grace        |`,
    },
    {
      title: "Right-aligned numbers",
      note: "Alignment sets the delimiter row and the padding.",
      input: `item,qty
apple,10
fig,2`,
      output: `|  item | qty |
| ----: | --: |
| apple |  10 |
|   fig |   2 |`,
    },
    {
      title: "Pipes and line breaks",
      note: "A pipe would end the cell, so it is escaped; a newline becomes <br>.",
      input: `cmd,note
"ls | wc -l","counts
entries"`,
      output: `| cmd         | note              |
| ----------- | ----------------- |
| ls \\| wc -l | counts<br>entries |`,
    },
  ],
  faq: [
    {
      question: "Can I paste directly from Excel or Google Sheets?",
      answer:
        "Yes. Copying a range of cells puts tab-separated text on the clipboard, and the Auto delimiter picks tabs first. Cells that contain line breaks are copied wrapped in quotes, which the parser understands, and those line breaks are turned into <br> tags in the table.",
    },
    {
      question: "Which Markdown flavour does the output use?",
      answer:
        "GitHub Flavored Markdown tables: a header row, a delimiter row of dashes with optional colons for alignment, then one row per record, each wrapped in pipes. GitLab, Bitbucket, Obsidian, most static site generators and many documentation tools render the same syntax.",
    },
    {
      question: "What happens to rows with fewer columns than others?",
      answer:
        "Every row is padded with empty cells up to the widest row, including the header. GitHub only renders a table when the header and delimiter rows have the same number of cells, and padding the body keeps empty cells visible instead of shifting values into the wrong column.",
    },
    {
      question: "Why do the columns not line up in my editor with emoji or Chinese text?",
      answer:
        "Padding counts characters, not the width your font draws them at, and many emoji and CJK characters are drawn twice as wide in a monospaced editor. The rendered table is unaffected, because Markdown ignores the padding; turn off \"Align columns in the source\" if you prefer compact output.",
    },
    {
      question: "Is my data uploaded anywhere?",
      answer:
        "No. The conversion is a plain TypeScript function that runs in your browser, so the CSV you paste never leaves your device.",
    },
  ],
};
