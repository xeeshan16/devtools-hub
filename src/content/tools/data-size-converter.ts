import type { ToolContent } from "@/content/types";

export const dataSizeConverterContent: ToolContent = {
  howToUse: [
    "Type a size with its unit, such as 1.5 GiB, 500 MB, 100 Mb or 4096. The value is converted to every unit at once as you type, and the unit you typed is highlighted.",
    "A capital B means bytes and a lower-case b means bits, so MB is megabytes and Mb is megabits. Add an i for binary units: KiB, MiB and GiB are powers of 1024, while kB, MB and GB are powers of 1000. Unit names such as gigabytes or mebibits work too.",
    "A number without a unit is read as bytes; switch to Bits if you are pasting a bit count. Results are exact, and any value that had to be rounded is marked with ≈. The copy button copies the plain number without separators.",
  ],
  examples: [
    {
      title: "Binary to decimal units",
      note: "The same amount of data, in powers of 1024 and of 1000.",
      input: "1.5 GiB",
      output: "1,536 MiB\n1,610,612,736 B\n≈ 1.61 GB",
    },
    {
      title: "Why a 500 GB drive shows less space",
      note: "Drive makers count in GB; many operating systems report GiB.",
      input: "500 GB",
      output: "≈ 465.661287 GiB",
    },
    {
      title: "Network speed in bits to bytes",
      note: "A 100 Mb/s link moves this much data per second, before protocol overhead.",
      input: "100 Mb",
      output: "12.5 MB\n≈ 11.920929 MiB",
    },
  ],
  faq: [
    {
      question: "What is the difference between MB and MiB?",
      answer:
        "MB (megabyte) is 1,000,000 bytes, using the decimal SI prefix. MiB (mebibyte) is 1,048,576 bytes, or 1024 × 1024, using the binary IEC prefix. The gap grows with each step: a GiB is about 7% larger than a GB and a TiB about 10% larger than a TB.",
    },
    {
      question: "Is 1 KB 1000 or 1024 bytes?",
      answer:
        "Under the SI and IEC standards, kB and KB mean 1000 bytes and KiB means 1024. Windows and some older documentation still use KB, MB and GB for powers of 1024; if a value comes from one of those, enter it as KiB, MiB or GiB to get the right number of bytes.",
    },
    {
      question: "What is the difference between Mb and MB?",
      answer:
        "Mb is megabits and MB is megabytes. A byte is 8 bits, so 100 Mb is 12.5 MB. Network speeds and bandwidth are usually quoted in bits per second, and file sizes in bytes. This converter reads the last letter's case: B is bytes, b is bits. Prefix letters are not case-sensitive, so kb, Kb and KB all have a prefix of 1000.",
    },
    {
      question: "Why does my 1 TB drive show as 931 GB?",
      answer:
        "The drive maker counts 1 TB as 1,000,000,000,000 bytes. Many operating systems divide by powers of 1024 but still label the result GB, and 10^12 bytes is about 931.32 GiB. No space is missing; the two numbers use different units.",
    },
    {
      question: "Are the results exact?",
      answer:
        "Yes. Sizes are stored as exact fractions of a bit instead of floating-point numbers, so 1.1 KiB converts to exactly 1,126.4 bytes and very large values such as 16 EiB keep every digit. Results with more decimal places than are shown are rounded and marked with ≈.",
    },
    {
      question: "Is anything I type sent to a server?",
      answer:
        "No. The conversion runs entirely in your browser with plain JavaScript. Nothing you type is uploaded, logged or stored.",
    },
  ],
};
