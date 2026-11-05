import type { ToolContent } from "@/content/types";

export const queryStringJsonContent: ToolContent = {
  howToUse: [
    "Choose a direction, then paste a query string, a whole URL or a JSON object into the input panel. The converted result appears on the right as you type.",
    "Going from query string to JSON, everything before the ? and after the # is ignored, + and %XX escapes are decoded, and a key that appears more than once becomes an array. With nested keys on, bracket keys such as user[name], tags[] and items[0][sku] build nested objects and arrays the way PHP, Rails and the qs library read them.",
    "Going from JSON to a query string, nested objects become bracket keys and every name and value is percent-encoded. Arrays of plain values are written as repeated keys (tag=a&tag=b) or with brackets (tag[]=a&tag[]=b), whichever your server expects.",
    "Useful for reading a long tracking or search URL, building test requests, or turning form data into a request body. Nothing is uploaded.",
  ],
  examples: [
    {
      title: "URL to JSON",
      note: "Only the query is read; + becomes a space and repeated keys become an array.",
      input: "https://example.com/search?q=wireless+mouse&tag=sale&tag=new&page=2",
      output: `{
  "q": "wireless mouse",
  "tag": [
    "sale",
    "new"
  ],
  "page": "2"
}`,
    },
    {
      title: "Nested bracket keys",
      note: "With nested keys on, brackets build objects and arrays.",
      input: "user[name]=Ada&user[address][city]=London&items[0][sku]=A1&items[1][sku]=B2",
      output: `{
  "user": {
    "name": "Ada",
    "address": {
      "city": "London"
    }
  },
  "items": [
    {
      "sku": "A1"
    },
    {
      "sku": "B2"
    }
  ]
}`,
    },
    {
      title: "JSON to query string",
      note: "Values are percent-encoded; null becomes an empty value.",
      input: '{"q":"100% cotton","sizes":["S","M"],"filter":{"color":"navy"},"cursor":null}',
      output: "q=100%25%20cotton&sizes=S&sizes=M&filter[color]=navy&cursor=",
    },
  ],
  faq: [
    {
      question: "Why are numbers and booleans strings in the JSON output?",
      answer:
        "A query string has no types: page=2 and debug=true are just text. The tool keeps every value as a string so nothing is guessed wrong, such as a ZIP code or an ID with a leading zero turning into a number. Convert types in your own code, where you know what each parameter means.",
    },
    {
      question: "Should arrays use repeated keys or brackets?",
      answer:
        "It depends on the server. Repeated keys (tag=a&tag=b) are what HTML forms send and what URLSearchParams.getAll, Go, Python and Java read natively. The bracket form (tag[]=a&tag[]=b) is what PHP, Rails and the Node qs library expect. Arrays of objects always get an index, such as items[0][sku], so they read back the same way.",
    },
    {
      question: "Is + a space or a plus sign?",
      answer:
        "In a query string, + means a space, because that is how HTML forms encode them, and URLSearchParams reads it the same way. A literal plus sign must be written as %2B. When building a query string the tool writes spaces as %20, which every server reads as a space.",
    },
    {
      question: "What happens when two parameters conflict?",
      answer:
        "With nested keys on, a=1 followed by a[b]=2 asks for a to be both a value and an object. The tool keeps the first one, skips the later parameter and lists it under the output, rather than silently dropping data. Turn nested keys off to see every parameter exactly as named.",
    },
    {
      question: "Why are empty arrays and objects left out?",
      answer:
        "A query string has no way to say that a list or object exists but is empty: tags[]= would read back as a list containing one empty string. The tool leaves them out and notes it, so you can decide whether the server needs a placeholder value instead.",
    },
  ],
};
