export type CaseId =
  | "upper"
  | "lower"
  | "title"
  | "sentence"
  | "camel"
  | "pascal"
  | "snake"
  | "kebab";

export const CASES: { id: CaseId; label: string; hint: string }[] = [
  { id: "upper", label: "UPPERCASE", hint: "Every character upper-cased" },
  { id: "lower", label: "lowercase", hint: "Every character lower-cased" },
  { id: "title", label: "Title Case", hint: "Each Word Capitalized" },
  { id: "sentence", label: "Sentence case", hint: "Only the first letter capitalized" },
  { id: "camel", label: "camelCase", hint: "No separators, first word lower-case" },
  { id: "pascal", label: "PascalCase", hint: "No separators, every word capitalized" },
  { id: "snake", label: "snake_case", hint: "Words joined with underscores" },
  { id: "kebab", label: "kebab-case", hint: "Words joined with hyphens" },
];

/**
 * Breaks input into words regardless of its original convention, so a
 * snake_case or camelCase identifier converts cleanly into any other case —
 * not just prose with spaces. Runs before every case except upper/lower,
 * which are simple character maps that don't need word boundaries.
 */
export function splitWords(input: string): string[] {
  return input
    .trim()
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2") // "XMLHttp" -> "XML Http"
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // "helloWorld" -> "hello World"
    .split(/[\s_-]+/)
    .filter(Boolean);
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function convertCase(input: string, id: CaseId): string {
  if (!input) return "";

  if (id === "upper") return input.toUpperCase();
  if (id === "lower") return input.toLowerCase();

  const words = splitWords(input);
  if (words.length === 0) return "";

  switch (id) {
    case "title":
      return words.map(capitalize).join(" ");
    case "sentence":
      return capitalize(words.join(" ").toLowerCase());
    case "camel":
      return (
        words[0].toLowerCase() +
        words
          .slice(1)
          .map(capitalize)
          .join("")
      );
    case "pascal":
      return words.map(capitalize).join("");
    case "snake":
      return words.map((w) => w.toLowerCase()).join("_");
    case "kebab":
      return words.map((w) => w.toLowerCase()).join("-");
  }
}

export function convertAllCases(input: string): Record<CaseId, string> {
  return Object.fromEntries(
    CASES.map((c) => [c.id, convertCase(input, c.id)]),
  ) as Record<CaseId, string>;
}
