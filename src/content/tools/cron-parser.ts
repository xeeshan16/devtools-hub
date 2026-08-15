import type { ToolContent } from "@/content/types";

export const cronParserContent: ToolContent = {
  howToUse: [
    "Type a cron expression into the field, or pick one of the presets underneath it. The plain-English description updates immediately.",
    "Both the standard five-field crontab form and the six-field form with a leading seconds column are accepted, as are the shorthand aliases such as at-daily and at-hourly.",
    "The Fields table explains what each column means and which values it accepts, which is the fastest way to spot a value in the wrong position — the classic mistake of putting the hour where the minute belongs.",
    "Pick a time zone to see the next five run times calculated for it. Schedulers usually run in UTC even when your team thinks in local time, so check both before trusting an overnight job.",
  ],
  examples: [
    {
      title: "Every weekday morning",
      note: "Minute, hour, day-of-month, month, day-of-week.",
      input: "0 9 * * 1-5",
      output: "At 09:00 AM, Monday through Friday",
    },
    {
      title: "Every 15 minutes during office hours",
      note: "Step values with a range.",
      input: "*/15 9-17 * * *",
      output: "Every 15 minutes, 09:00 AM through 05:59 PM",
    },
    {
      title: "Shorthand alias",
      note: "Expanded to the equivalent five-field expression.",
      input: "@daily",
      output: "At 12:00 AM (0 0 * * *)",
    },
  ],
  faq: [
    {
      question: "What do the five fields mean?",
      answer:
        "In order: minute (0-59), hour (0-23), day of month (1-31), month (1-12 or JAN-DEC) and day of week (0-7 or SUN-SAT, where both 0 and 7 mean Sunday). An asterisk means every value, a slash sets a step, a hyphen sets a range and a comma lists individual values.",
    },
    {
      question: "What happens if I set both day of month and day of week?",
      answer:
        "They combine with OR, not AND — the job runs when either field matches. So 0 0 13 * 5 runs on the 13th of every month and on every Friday, not only on Friday the 13th. This surprises almost everyone the first time.",
    },
    {
      question: "Which time zone does cron use?",
      answer:
        "Classic Unix cron uses the server's local time zone, which means schedules shift twice a year with daylight saving and can skip or repeat an hour. Most modern schedulers — Kubernetes CronJobs, cloud schedulers, CI platforms — default to UTC. Check which applies to your runner, and use the selector here to preview both.",
    },
    {
      question: "Does this support the six-field format with seconds?",
      answer:
        "Yes. If the expression has six fields, the first is treated as seconds and the remaining five follow the standard order. Quartz-style schedulers and several JavaScript cron libraries use this form; standard Unix crontab does not.",
    },
    {
      question: "What do the @ aliases mean?",
      answer:
        "They are shorthand for common schedules: at-yearly and at-annually are 0 0 1 1 *, at-monthly is 0 0 1 * *, at-weekly is 0 0 * * 0, at-daily and at-midnight are 0 0 * * *, and at-hourly is 0 * * * *. This tool expands them so you can see exactly what they resolve to.",
    },
  ],
};
