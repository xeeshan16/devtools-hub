import type { ToolContent } from "@/content/types";

export const caseConverterContent: ToolContent = {
  howToUse: [
    "Paste text or an identifier into the input panel. Every case appears below it at once — there is no mode to pick first.",
    "Structural cases (Title, Sentence, camelCase, PascalCase, snake_case, kebab-case) split the input into words first, so a snake_case or camelCase identifier converts cleanly into any other case, not just plain prose with spaces.",
    "UPPERCASE and lowercase are a direct character map instead, so they preserve your original spacing and line breaks exactly rather than collapsing them into a single word stream.",
    "Copy any single result with the button on its card — there is no need to select text by hand.",
  ],
  examples: [
    {
      title: "snake_case to everything else",
      note: "A database column name converted to seven other conventions.",
      input: "user_first_name",
      output: "userFirstName · UserFirstName · User First Name · user-first-name",
    },
    {
      title: "camelCase to snake_case",
      note: "The common JavaScript-to-Python identifier conversion.",
      input: "userFirstName",
      output: "user_first_name",
    },
    {
      title: "An acronym stays together",
      note: "XML is kept as one word instead of splitting into X, M, L.",
      input: "XMLHttpRequest",
      output: "xml_http_request",
    },
  ],
  faq: [
    {
      question: "Is my text uploaded anywhere?",
      answer:
        "No. Every conversion runs in your browser with plain string operations. Nothing you paste is transmitted, logged or stored, so it is safe to paste real variable names, database columns or config keys from a private codebase.",
    },
    {
      question: "How does the tool know where one word ends and the next begins?",
      answer:
        "It looks for spaces, underscores and hyphens first, then also splits at case-boundaries inside a word — a lower-case or digit followed by an upper-case letter, as in helloWorld. Consecutive capitals are treated as an acronym and kept together, so XMLHttpRequest splits into XML, Http and Request rather than X, M, L, Http, Request.",
    },
    {
      question: "What is the difference between Title Case and Sentence case?",
      answer:
        "Title Case capitalizes the first letter of every word: User First Name. Sentence case capitalizes only the very first letter and lower-cases the rest, the way a normal sentence is written: User first name.",
    },
    {
      question: "Why did converting to UPPERCASE keep my original line breaks, but converting to snake_case did not?",
      answer:
        "UPPERCASE and lowercase are character maps applied to the input exactly as typed, spacing included. Every other case rebuilds the output from individual words joined by its own convention — a space, an underscore, a hyphen, or nothing — which is why those results are always a single line.",
    },
  ],
};
