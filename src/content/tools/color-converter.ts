import type { ToolContent } from "@/content/types";

export const colorConverterContent: ToolContent = {
  howToUse: [
    "Type or paste a color, or pick one with the color picker. The HEX, RGB and HSL forms appear as you type, next to a swatch, and each has its own copy button.",
    "Paste colors the way they appear in stylesheets and design tools: hex with 3, 4, 6 or 8 digits (with or without the #), rgb() and rgba(), and hsl() and hsla(), in either the comma or the space-separated CSS syntax. Alpha can be a number such as 0.5 or a percentage such as 50%.",
    "Below the conversions, the tool shows the WCAG contrast ratio of the color as text on a white and on a black background, and whether that passes AA or AAA. Translucent colors are blended with the background first, because that blend is what a reader sees.",
  ],
  examples: [
    {
      title: "Hex to RGB and HSL",
      note: "HSL keeps one decimal place, enough to convert back to the same hex.",
      input: "#1e90ff",
      output: "rgb(30, 144, 255) · hsl(209.6, 100%, 55.9%)",
    },
    {
      title: "A translucent color",
      note: "Space-separated syntax with a slash before the alpha.",
      input: "rgb(255 0 0 / 50%)",
      output: "#ff000080 · rgba(255, 0, 0, 0.5) · hsla(0, 100%, 50%, 0.5)",
    },
    {
      title: "Checking a grey for body text",
      note: "Just short of the 4.5:1 that WCAG AA asks for normal-sized text on white.",
      input: "#777777",
      output: "4.48:1 on white (AA Large) · 4.68:1 on black (AA)",
    },
  ],
  faq: [
    {
      question: "How do I convert hex to RGB?",
      answer:
        "Split the six hex digits into three pairs and read each pair as a number from 0 to 255. For #1e90ff that is 1e = 30, 90 = 144 and ff = 255, so rgb(30, 144, 255). A three-digit code such as #f80 is shorthand for #ff8800.",
    },
    {
      question: "What does the contrast ratio mean?",
      answer:
        "It compares the relative luminance of the text and background colors, from 1:1 (identical) to 21:1 (black on white). WCAG 2 level AA asks for at least 4.5:1 for normal text and 3:1 for large text (about 24px, or 19px bold); level AAA asks for 7:1 and 4.5:1.",
    },
    {
      question: "How is alpha shown in hex?",
      answer:
        "As a fourth pair of digits, from 00 (fully transparent) to ff (opaque), so 50% red is #ff000080. The tool only adds this pair when the color is not fully opaque. Four-digit codes such as #0f08 are the short form of eight-digit ones.",
    },
    {
      question: "Why is my color rejected?",
      answer:
        "Each value must be in range: 0 to 255 or 0% to 100% for RGB channels, 0% to 100% for saturation and lightness, and 0 to 1 for alpha. The error names the value that is out of range instead of clamping it, so a typo is not mistaken for a valid color. Hue can be any angle and wraps around, in degrees by default or with deg, rad, grad or turn.",
    },
    {
      question: "Does it support color names or newer CSS color spaces?",
      answer:
        "Not yet. Named colors such as tomato and newer notations such as oklch() and color() are not parsed. HEX, RGB and HSL cover what most stylesheets and design tools exchange.",
    },
  ],
};
