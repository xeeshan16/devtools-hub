import type { ToolContent } from "@/content/types";

export const semverCheckerContent: ToolContent = {
  howToUse: [
    "Type a range the way you would write it in package.json: ^1.2.3, ~2.1, 1.x, >=1.0.0 <2, 1.2 - 1.4 or several of these joined with ||. Under the field you see the range expanded into plain comparators, which is exactly how npm evaluates it.",
    "Paste the versions to test, one per line. A JSON array or the output of npm view <package> versions works too, since brackets, quotes and commas are ignored. Entries that are not full semantic versions, such as latest or 1.2, are listed and skipped.",
    "The result lists every version newest first, sorted by semver precedence, with the ones the range accepts ticked and the highest match marked: that is the version npm would install from this list. Copy gives you just the matching versions. Leave the range empty to simply sort a list of versions.",
  ],
  examples: [
    {
      title: "Caret range",
      note: "^ allows any change that keeps the major version, but pre-releases are left out.",
      input: "^1.4.0 against 1.3.9, 1.4.2, 1.5.0-beta.1, 1.12.3, 2.0.0",
      output: ">=1.4.0 <2.0.0-0 → 1.12.3, 1.4.2 (highest: 1.12.3)",
    },
    {
      title: "Caret below 1.0.0",
      note: "When the major version is 0, the minor version is treated as the breaking one.",
      input: "^0.2.3 against 0.2.9, 0.3.0",
      output: ">=0.2.3 <0.3.0-0 → 0.2.9",
    },
    {
      title: "Tilde range",
      note: "~ only allows patch updates when a minor version is given.",
      input: "~1.2.3 against 1.2.9, 1.3.0",
      output: ">=1.2.3 <1.3.0-0 → 1.2.9",
    },
    {
      title: "Hyphen range with a partial upper bound",
      note: "A partial version on the right includes everything it covers.",
      input: "1.2.3 - 2.3",
      output: ">=1.2.3 <2.4.0-0",
    },
  ],
  faq: [
    {
      question: "What is the difference between ^ and ~?",
      answer:
        "A caret allows every update that does not change the leftmost non-zero part of the version: ^1.2.3 accepts anything from 1.2.3 up to but not including 2.0.0, while ^0.2.3 stops before 0.3.0 and ^0.0.3 only accepts 0.0.3 itself. A tilde allows patch updates when a minor version is given: ~1.2.3 accepts 1.2.x from 1.2.3 upwards, and ~1 accepts any 1.x.x.",
    },
    {
      question: "Why does ^1.2.3 not match 1.3.0-beta?",
      answer:
        "npm keeps pre-releases out of a range unless the range itself names a pre-release of the same major, minor and patch version. ^1.2.3-beta.2 therefore matches 1.2.3-beta.4 but not 1.3.0-beta.1. This stops an ordinary range from silently installing unstable versions. The rule is the same as in node-semver without the includePrerelease option.",
    },
    {
      question: "What does the -0 in <2.0.0-0 mean?",
      answer:
        "0 is the lowest possible pre-release identifier, so 2.0.0-0 sorts below every pre-release of 2.0.0. Writing the upper bound as <2.0.0-0 rather than <2.0.0 makes it clear that 2.0.0-rc.1 is excluded too. It is how node-semver itself writes the expanded range.",
    },
    {
      question: "How are versions sorted?",
      answer:
        "By semver 2.0.0 precedence: major, minor and patch compare as numbers, so 1.10.0 is newer than 1.9.0, and a pre-release sorts before its release, so 2.0.0-rc.1 comes before 2.0.0. Pre-release identifiers are compared one by one, numbers by value and text alphabetically, with numbers ranking lower than text. Build metadata after a + is ignored for ordering.",
    },
    {
      question: "Is anything uploaded?",
      answer:
        "No. Ranges and versions are parsed and compared in your browser with plain TypeScript, without calling the npm registry or any other server. To check a real package, paste the output of npm view <package> versions --json.",
    },
  ],
};
