import type { ToolContent } from "@/content/types";

export const isoDurationConverterContent: ToolContent = {
  howToUse: [
    "Paste an ISO 8601 duration such as P1DT2H30M, PT45S or P2W. The tool breaks it into years, months, weeks, days, hours, minutes and seconds and describes it in plain English as you type.",
    "For durations with a fixed length, it shows the total in milliseconds, seconds, minutes, hours, days and weeks, and rewrites the duration in normalized form: PT90M becomes PT1H30M. Values that had to be rounded are marked with ≈, and the copy buttons copy the plain number.",
    "You can also type a plain number of seconds, such as 5400, to get its ISO 8601 form. A leading minus sign makes the duration negative.",
  ],
  examples: [
    {
      title: "Duration to total seconds",
      note: "A video length as returned by many APIs.",
      input: "PT1H2M30S",
      output: "1 hour, 2 minutes, 30 seconds\n3,750 seconds",
    },
    {
      title: "Normalize an overflowing duration",
      note: "Minutes past 59 roll over into hours, and hours past 23 into days.",
      input: "PT1590M",
      output: "P1DT2H30M\nPT26H30M (hours only)",
    },
    {
      title: "Seconds to ISO 8601",
      note: "A plain number is read as seconds.",
      input: "93784.5",
      output: "P1DT2H3M4.5S",
    },
  ],
  faq: [
    {
      question: "What is the ISO 8601 duration format?",
      answer:
        "It writes a length of time as P followed by date components, then T followed by time components: PnYnMnWnDTnHnMnS. P1Y2M10DT2H30M means 1 year, 2 months, 10 days, 2 hours and 30 minutes. Components that are zero can be left out, but at least one must be present, and the T is needed whenever hours, minutes or seconds follow.",
    },
    {
      question: "Is P1M one month or one minute?",
      answer:
        "One month. M before the T means months and M after it means minutes, so one minute is PT1M. Mixing these up is the most common mistake with ISO 8601 durations.",
    },
    {
      question: "Why are there no totals for durations with years or months?",
      answer:
        "Years and months do not have a fixed number of seconds: a month is 28 to 31 days and a year 365 or 366. Their length depends on the date they are added to, so the tool shows the components but does not guess a total. Weeks, days and smaller units are converted exactly.",
    },
    {
      question: "How long is a day here?",
      answer:
        "Exactly 24 hours, which is how Java's Duration, .NET and most libraries treat a D component. A calendar day that crosses a daylight-saving change can be 23 or 25 hours, so add a duration to a date in a time-zone-aware library if that matters.",
    },
    {
      question: "Can components have decimals?",
      answer:
        "Yes, but only the smallest component written: PT1.5H and PT0.25S are valid, P1.5DT2H is not. A comma works as the decimal sign too, as the standard allows. Fractions are converted exactly, to nanosecond precision.",
    },
    {
      question: "Is anything I type sent to a server?",
      answer:
        "No. The parsing and conversion run entirely in your browser with plain JavaScript. Nothing you type is uploaded, logged or stored.",
    },
  ],
};
