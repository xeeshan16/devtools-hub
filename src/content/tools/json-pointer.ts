import type { ToolContent } from "@/content/types";

export const jsonPointerContent: ToolContent = {
  howToUse: [
    "Paste a JSON document and type a JSON Pointer such as /users/0/email. The value it refers to appears on the right, pretty-printed with its type. An empty pointer refers to the whole document.",
    "Pointers copied from URIs or OpenAPI $ref values work as they are: the #/… fragment form is percent-decoded first. The tool shows the canonical pointer, its URI fragment form and the decoded reference tokens, each ready to copy.",
    "Below the document, every pointer it contains is listed with a short preview of its value. Select one to evaluate it, which is the quickest way to find the exact path for a JSON Patch operation or a $ref.",
  ],
  examples: [
    {
      title: "Array element",
      note: "Array items are addressed by zero-based index.",
      input: '{"foo": ["bar", "baz"]}  ·  /foo/1',
      output: '"baz" (string)',
    },
    {
      title: "Keys containing / or ~",
      note: "A slash in a key is written ~1 and a tilde ~0, so the key a/b becomes /a~1b.",
      input: '{"a/b": 1, "m~n": 8}  ·  /a~1b',
      output: "1 (number) · URI fragment #/a~1b",
    },
    {
      title: "URI fragment from a $ref",
      note: "Percent-encoding is decoded before the ~ escapes.",
      input: '{"c%d": 2, " ": 7}  ·  #/c%25d',
      output: "2 (number) · pointer /c%d",
    },
    {
      title: "Index past the end",
      note: "The - token means the slot after the last item, which only exists when adding.",
      input: '{"foo": ["bar", "baz"]}  ·  /foo/-',
      output: 'Error: "-" refers to the element after the last one, which only exists when adding (JSON Patch).',
    },
  ],
  faq: [
    {
      question: "What is a JSON Pointer?",
      answer:
        'JSON Pointer, defined in RFC 6901, is a string syntax for identifying one value inside a JSON document. It is a list of reference tokens, each prefixed by a slash: /store/books/0/title means the "title" member of the first item of the "books" array inside "store". JSON Patch (RFC 6902), JSON Schema and OpenAPI $ref values all use it.',
    },
    {
      question: "How do I escape / and ~ in a key?",
      answer:
        "Write ~ as ~0 and / as ~1. When decoding, ~1 is replaced first and then ~0, so the token ~01 means the literal key ~1, not /. Any other character after a tilde is invalid. No other characters need escaping in the plain string form.",
    },
    {
      question: "What's the difference between /foo and #/foo?",
      answer:
        "/foo is the plain string form used in JSON Patch and most APIs. #/foo is the URI fragment form used after a URL or in $ref, where characters that aren't allowed in a URI fragment, such as spaces, % or \", are percent-encoded: the key \"c%d\" becomes #/c%25d. Both point at the same value.",
    },
    {
      question: "Why does /items/01 or /items/- fail?",
      answer:
        "Array indexes must be plain decimal numbers without leading zeros, so 01, +1 and -1 are invalid. The special token - refers to the position after the last element. It is useful in a JSON Patch add operation to append, but there is never a value there to read.",
    },
    {
      question: "How is JSON Pointer different from JSONPath?",
      answer:
        "A JSON Pointer always identifies exactly one value and has no wildcards, filters or recursive descent, which makes it safe to use as an address in patches and references. JSONPath ($.store.books[*].title) is a query language that can return many values. Use a pointer when you need a stable path to one place.",
    },
  ],
};
