import type { ToolContent } from "@/content/types";

export const jsonToTypescriptContent: ToolContent = {
  howToUse: [
    "Paste a JSON sample — an API response, a config file or a fixture — into the input panel. TypeScript declarations appear on the right as you type, ready to copy into your code.",
    "Set the root type name to what the data represents, such as Order or ApiResponse, and pick whether you want interface declarations or type aliases. Nested objects get their own named types, derived from their keys.",
    "Types are inferred from the values in the sample, so give it a representative one: when an array holds several objects they are merged, keys missing from some become optional and keys seen with different types become unions.",
  ],
  examples: [
    {
      title: "Nested object",
      note: "Each nested object becomes its own named type.",
      input: '{ "id": 1, "owner": { "login": "ada" } }',
      output: `export interface Root {
  id: number;
  owner: Owner;
}

export interface Owner {
  login: string;
}`,
    },
    {
      title: "Array of objects",
      note: "Elements are merged; a key missing from some is optional.",
      input: '{ "users": [{ "id": 1, "name": "Ada" }, { "id": 2 }] }',
      output: `export interface Root {
  users: User[];
}

export interface User {
  id: number;
  name?: string;
}`,
    },
    {
      title: "Mixed values",
      note: "Different value types for one key become a union.",
      input: '{ "values": [1, "two", null] }',
      output: `export interface Root {
  values: (string | number | null)[];
}`,
    },
  ],
  faq: [
    {
      question: "Should I use interface or type?",
      answer:
        "For plain object shapes like these they are interchangeable. Interfaces can be extended and merged by later declarations and tend to give shorter editor tooltips; type aliases can also express unions and mapped types. Many codebases pick one by convention, so the tool lets you match yours.",
    },
    {
      question: "Why is a field typed as null instead of string | null?",
      answer:
        "The generator only knows what is in the sample. If a field is null everywhere it appears, there is no evidence of what it holds otherwise. Include an example where it has a value, or edit the generated type to add it.",
    },
    {
      question: "How are optional fields detected?",
      answer:
        "When an array contains several objects, they are merged into one type. A key that appears in some of the objects but not all of them is marked optional with ?. A key that is present but null is not optional: it becomes a union with null instead, which is how JSON APIs usually distinguish the two.",
    },
    {
      question: "Why are empty arrays typed as unknown[]?",
      answer:
        "An empty array gives no information about its elements, and unknown is the honest answer: TypeScript will make you check the value before using it. Put at least one element in the sample array to get a precise type.",
    },
    {
      question: "Are the generated types checked at runtime?",
      answer:
        "No. TypeScript types are erased when your code compiles, so they describe what you expect rather than verifying it. For data from outside your program, such as an API response, pair the types with a runtime validator if a mismatch would be costly.",
    },
  ],
};
