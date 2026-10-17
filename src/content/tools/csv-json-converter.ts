import type { ToolContent } from "@/content/types";

export const csvJsonContent: ToolContent = {
  howToUse: [
    "Choose a direction — CSV to JSON or JSON to CSV — and the delimiter your file uses, then paste it into the input panel. The converted result appears on the right as you type.",
    "With \"First row is a header\" on, each CSV row becomes an object keyed by the column names. Turn it off to get an array of arrays instead, which is what you want for files with no header or duplicate column names.",
    "Going the other way, an array of objects becomes a header row plus one line per object, and an array of arrays is written row for row. Fields are quoted only when they contain the delimiter, a quote or a line break.",
    "Errors name the line or row they were found on, so a stray quote or a row with a missing column is quick to track down in a large export.",
  ],
  examples: [
    {
      title: "CSV to JSON",
      note: "The header row becomes the keys.",
      input: `id,name
1,Ada
2,Grace`,
      output: `[
  { "id": "1", "name": "Ada" },
  { "id": "2", "name": "Grace" }
]`,
    },
    {
      title: "Quoted fields",
      note: "Commas and doubled quotes inside quotes are part of the value.",
      input: `name,motto
"Hopper, Grace","It's easier to ask ""forgiveness"""`,
      output: `[{ "name": "Hopper, Grace", "motto": "It's easier to ask \\"forgiveness\\"" }]`,
    },
    {
      title: "JSON to CSV",
      note: "Missing keys become empty fields; nested values are kept as JSON.",
      input: '[{"id":1,"tags":["a","b"]},{"id":2,"active":false}]',
      output: `id,tags,active
1,"[""a"",""b""]",
2,,false`,
    },
  ],
  faq: [
    {
      question: "Why are numbers in my CSV converted to strings?",
      answer:
        "CSV has no types — every field is text — so the converter keeps it that way. Guessing would turn ZIP codes like 02134, phone numbers and long IDs into numbers and silently drop their leading zeros or precision. Convert the specific fields you need in your own code, where you know what each column means.",
    },
    {
      question: "Which CSV dialect does this follow?",
      answer:
        "RFC 4180, the closest thing CSV has to a standard. Fields can be wrapped in double quotes; a quoted field can contain the delimiter, line breaks and quotes written twice. Both LF and CRLF line endings are accepted, and a UTF-8 byte-order mark from a spreadsheet export is removed.",
    },
    {
      question: "My file uses semicolons. Is that supported?",
      answer:
        "Yes. Spreadsheet apps in locales that use a comma as the decimal separator export CSV with semicolons, and tab-separated files are common too. Pick Semicolon or Tab and the same delimiter is used for parsing and for quoting in the other direction.",
    },
    {
      question: "What happens to nested objects when converting JSON to CSV?",
      answer:
        "CSV is flat, so nested objects and arrays are written into the cell as JSON text rather than flattened into dotted column names. Nothing is lost, and converting back gives you that JSON text as a string you can parse again.",
    },
    {
      question: "Why does it reject a row with the wrong number of fields?",
      answer:
        "A short or long row almost always means a missing quote or an unescaped delimiter earlier on the line, and mapping it onto the header anyway would put values under the wrong keys. The error gives the row number so you can fix the source; blank lines are skipped rather than reported.",
    },
  ],
};
