import type { ToolContent } from "@/content/types";

export const contentDispositionParserContent: ToolContent = {
  howToUse: [
    "Paste a Content-Disposition header value, with or without the Content-Disposition: prefix. Lines copied from curl -v or DevTools work as they are.",
    "The summary shows the disposition type and what it does, the file name a browser will use (the decoded filename* when it is valid, otherwise filename), its fallback, and the name the file is saved under once directories and reserved characters are removed. Every parameter is listed with quotes and escapes removed.",
    "Warnings flag mistakes that make downloads land under the wrong name, such as a quoted or malformed filename*, a non-ASCII or percent-encoded plain filename, or a form-data part without a name.",
    "To write a header, type a file name under Build a header and pick attachment or inline. Names with accents, other scripts or emoji get an ASCII fallback plus filename*.",
  ],
  examples: [
    {
      title: "Download with a plain file name",
      note: "The most common form, sent with file downloads.",
      input: 'Content-Disposition: attachment; filename="report-2026.pdf"',
      output: "Type attachment: download and save · file name report-2026.pdf.",
    },
    {
      title: "Non-ASCII file name with a fallback",
      note: "filename* carries the exact name; filename is for old clients.",
      input: "Content-Disposition: attachment; filename=\"resume.pdf\"; filename*=UTF-8''r%C3%A9sum%C3%A9.pdf",
      output: "File name résumé.pdf (from filename*) · encoding UTF-8 · fallback resume.pdf.",
    },
    {
      title: "Multipart form field",
      note: "The header each part of a multipart/form-data upload carries.",
      input: 'Content-Disposition: form-data; name="avatar"; filename="me.png"',
      output: "Type form-data · field name avatar · file name me.png.",
    },
    {
      title: "Quoted filename*",
      note: "A common mistake; some browsers then ignore filename*.",
      input: "Content-Disposition: attachment; filename*=\"UTF-8''na%C3%AFve.txt\"",
      output: "Warning: filename* must not be in double quotes. Warning: there is no plain filename fallback.",
    },
  ],
  faq: [
    {
      question: "What is the Content-Disposition header?",
      answer:
        "Content-Disposition is an HTTP response header, defined in RFC 6266, that tells the browser whether to show the content in the page (inline) or download it (attachment), and which file name to suggest when saving it. The same header also labels each part of a multipart/form-data request body, where its name parameter says which form field the part belongs to.",
    },
    {
      question: "What is the difference between inline and attachment?",
      answer:
        "inline asks the browser to display the content, for example to open a PDF in its viewer, and is what happens when the header is missing. attachment asks it to download the content and save it as a file. With either type, the filename parameter suggests the name to save it under. Browsers treat unknown types like attachment.",
    },
    {
      question: "How do I send a file name with accents or non-Latin characters?",
      answer:
        "Use filename* with the RFC 8187 encoding: the charset, two single quotes (with an optional language tag between them) and the percent-encoded UTF-8 bytes, for example filename*=UTF-8''r%C3%A9sum%C3%A9.pdf. Send a plain ASCII filename as well, as a fallback for clients that don't understand filename*. Don't put raw non-ASCII characters in filename; browsers decode them inconsistently.",
    },
    {
      question: "What if both filename and filename* are present?",
      answer:
        "Clients that understand filename* use it and ignore filename, as long as filename* is valid. If filename* is malformed, quoted, or uses an unsupported charset, they fall back to filename. This tool shows which parameter the file name came from.",
    },
    {
      question: "Can a file name contain a path?",
      answer:
        "No. Browsers keep only the last segment after any / or \\ and replace characters the operating system doesn't allow, so a header can't make a download land outside the downloads folder. Servers should strip directories themselves and never trust a file name taken from a form-data upload as a path on disk.",
    },
  ],
};
