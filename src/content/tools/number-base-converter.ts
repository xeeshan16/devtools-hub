import type { ToolContent } from "@/content/types";

export const numberBaseContent: ToolContent = {
  howToUse: [
    "Pick the base your number is written in, then type or paste it. The binary, octal, decimal and hexadecimal forms appear as you type, together with how many bits the value needs and the smallest standard integer types that can hold it.",
    "You can paste numbers the way they appear in code: a 0x, 0b or 0o prefix matching the chosen base, a leading minus sign, and _ or spaces between digits are all accepted. Decimal also accepts thousands separators such as 1,000,000.",
    "Tick Group digits with _ to split the output into groups of four digits (binary and hex) or three (octal and decimal). Underscore separators are also valid inside number literals in JavaScript, Python, Go, Rust and Java.",
    "Integers of any size convert exactly, because the tool uses arbitrary-precision BigInt arithmetic rather than floating-point numbers.",
  ],
  examples: [
    {
      title: "Decimal to binary and hex",
      note: "One byte with every bit set.",
      input: "255",
      output: "binary 11111111 · octal 377 · hex ff",
    },
    {
      title: "Hex to decimal",
      note: "With digit grouping on, binary is split into nibbles that line up with the hex digits.",
      input: "0xCAFE",
      output: "decimal 51966 · binary 1100_1010_1111_1110",
    },
    {
      title: "The largest signed 32-bit integer",
      note: "Fits int32 exactly; one more would need int64.",
      input: "0x7fffffff",
      output: "decimal 2147483647 · 31 bits · fits uint32 · fits int32",
    },
  ],
  faq: [
    {
      question: "How do I convert hexadecimal to decimal?",
      answer:
        "Each hex digit is worth 16 times the digit to its right. For 0xFF that is 15 × 16 + 15 = 255. Choose Hex as the input base, paste the value with or without its 0x prefix, and read the decimal row.",
    },
    {
      question: "Why does my number fail to convert?",
      answer:
        "Every character must be a valid digit in the chosen base: only 0 and 1 in binary, 0 to 7 in octal, 0 to 9 in decimal and 0 to 9 plus A to F in hex. The error names the first character that is not. If you pasted 0x1F with Decimal selected, the tool spots the prefix and suggests switching the input base.",
    },
    {
      question: "How are negative numbers shown?",
      answer:
        "As a minus sign followed by the magnitude, so -255 in hex is -ff. This is not the two's-complement bit pattern a CPU stores. To get that pattern for an n-bit type, add 2 to the power n: for an 8-bit value, -1 becomes 256 - 1 = 255, which is ff.",
    },
    {
      question: "Is there a size limit?",
      answer:
        "Integers convert exactly at any size up to 10,000 digits, far beyond 64-bit or 128-bit types. Unlike converters built on JavaScript numbers, values above 2^53 do not lose precision. Fractions and floating-point numbers are not supported.",
    },
    {
      question: "What do the uint and int labels mean?",
      answer:
        "They name the smallest standard unsigned and signed integer types, from 8 to 128 bits, that can store the value. A uint8 holds 0 to 255; an int8 holds -128 to 127. Use them to check whether a value will overflow a column, a struct field or a protocol header.",
    },
  ],
};
