import type { ToolContent } from "@/content/types";

export const timestampConverterContent: ToolContent = {
  howToUse: [
    "Leave the toggle on Unix to date and paste an epoch number, or switch to Date to Unix and paste an ISO 8601 string, to convert in either direction.",
    "Seconds and milliseconds are detected automatically from the magnitude of the number, so a ten-digit value is read as seconds and a thirteen-digit one as milliseconds. Override the guess with the unit selector when you are working with pre-1973 dates, where the two ranges overlap.",
    "The breakdown panel shows the same instant as seconds, milliseconds, ISO 8601, UTC, your local time zone and a relative description such as 3 hours ago — copy whichever representation you need.",
    "The current Unix time ticks live at the bottom of the input panel, and Use current time fills the field with it in the right format for the direction you are converting.",
  ],
  examples: [
    {
      title: "Epoch seconds to a date",
      note: "Ten digits, so it is read as seconds.",
      input: "1717243200",
      output: "2024-06-01T12:00:00.000Z",
    },
    {
      title: "Epoch milliseconds to a date",
      note: "Thirteen digits, so it is read as milliseconds.",
      input: "1717243200000",
      output: "2024-06-01T12:00:00.000Z",
    },
    {
      title: "ISO 8601 to epoch",
      note: "Any offset is honoured, then normalised to UTC.",
      input: "2024-06-01T14:00:00+02:00",
      output: "1717243200",
    },
  ],
  faq: [
    {
      question: "What is a Unix timestamp?",
      answer:
        "It is the number of seconds that have elapsed since 00:00:00 UTC on 1 January 1970, known as the Unix epoch. Because it is a single number in UTC with no time zone attached, it is the standard way to store and exchange an instant in time between systems.",
    },
    {
      question: "How do I tell seconds from milliseconds?",
      answer:
        "Count the digits. A present-day timestamp in seconds has ten digits; the same instant in milliseconds has thirteen. This tool applies that rule automatically, treating any value of 100,000,000,000 or more as milliseconds, and lets you override it when the value is ambiguous.",
    },
    {
      question: "Why does the local time differ from the UTC time shown?",
      answer:
        "A Unix timestamp is always UTC. The local row renders that same instant in your browser's time zone, including any daylight saving offset in effect on that date, so the two rows differ by your current offset from UTC.",
    },
    {
      question: "What is the year 2038 problem?",
      answer:
        "Systems that store Unix time in a signed 32-bit integer overflow on 19 January 2038, when the count exceeds 2,147,483,647. Modern platforms use 64-bit values and are unaffected. JavaScript uses a double, which safely covers roughly 285,000 years either side of the epoch.",
    },
    {
      question: "Can I convert a date before 1970?",
      answer:
        "Yes. Timestamps before the epoch are negative — for example -86400 is 31 December 1969. Enter the negative number directly, or convert an early ISO date with the Date to Unix direction.",
    },
  ],
};
