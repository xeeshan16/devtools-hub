import type { ToolContent } from "@/content/types";

export const curlToFetchContent: ToolContent = {
  howToUse: [
    "Paste a curl command: one you wrote, one from API docs, or one copied from your browser's developer tools with Copy as cURL. Multi-line commands joined with a trailing backslash work, and so do single quotes, double quotes and $'…' strings.",
    "The equivalent JavaScript fetch call appears as you type, with the method, headers, body and timeout carried over. JSON bodies are expanded into JSON.stringify so they are easy to edit, and -F form fields become a FormData body.",
    "Check the notes under the result. Anything fetch cannot do, such as skipping certificate checks with -k, going through a proxy or reading a file with -d @file, is listed there instead of being silently dropped.",
  ],
  examples: [
    {
      title: "POST a JSON body",
      note: "The method comes from -X and the JSON body is expanded for editing.",
      input: `curl -X POST https://api.example.com/v1/orders -H 'Content-Type: application/json' -d '{"sku":"A-100","qty":2}'`,
      output: `const response = await fetch("https://api.example.com/v1/orders", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    "sku": "A-100",
    "qty": 2
  }),
});`,
    },
    {
      title: "Basic auth and a form-encoded body",
      note: "-u becomes an Authorization header, and -d implies POST with the form content type, just as curl sends it.",
      input: "curl -u admin:changeme -d 'grant_type=client_credentials' https://auth.example.com/token",
      output: `const response = await fetch("https://auth.example.com/token", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "Authorization": "Basic YWRtaW46Y2hhbmdlbWU=",
  },
  body: "grant_type=client_credentials",
});`,
    },
    {
      title: "Multipart upload with -F",
      note: "Files are left as a placeholder Blob for you to fill in, for example from a file input.",
      input: "curl -F title=Report -F file=@report.pdf https://api.example.com/upload",
      output: `const form = new FormData();
form.append("title", "Report");
form.append("file", new Blob([/* contents of report.pdf */]), "report.pdf");

const response = await fetch("https://api.example.com/upload", {
  method: "POST",
  body: form,
});`,
    },
  ],
  faq: [
    {
      question: "Is my curl command uploaded anywhere?",
      answer:
        "No. The command is parsed and converted in your browser with plain JavaScript; nothing is sent, logged or stored. Commands copied from developer tools often contain session cookies and tokens, so that matters. The tool never runs the request either.",
    },
    {
      question: "Which curl options are supported?",
      answer:
        "The ones that shape the request: -X, -H, -d, --data-raw, --data-binary, --data-urlencode, --json, -F, -G, -I, -u, -A, -e, -b, -r, --oauth2-bearer, --url and -m / --max-time. Options that only change curl's own output or behaviour fetch already has, such as -s, -v, -o, -L and --compressed, are accepted silently. Anything else is listed in the notes as ignored.",
    },
    {
      question: "Why does -d turn my request into a POST?",
      answer:
        "Because that is what curl does. Sending data with -d makes curl use POST and, unless you set one, the Content-Type application/x-www-form-urlencoded. The converted code keeps both so the server sees the same request. Use -G to send the data as a query string on a GET request instead.",
    },
    {
      question: "Does fetch follow redirects like curl -L?",
      answer:
        "Yes, by default. Plain curl does not follow redirects unless you pass -L, but fetch follows them automatically, so -L needs no extra code. Add redirect: \"manual\" to the options if you want to handle redirects yourself.",
    },
    {
      question: "Why does the Cookie header not work in the browser?",
      answer:
        "Cookie is a forbidden request header: browsers do not let page scripts set it, and they send the site's own cookies instead when you pass credentials: \"include\". The generated code works as is in Node.js 18 and later, Deno and Bun, which allow it.",
    },
    {
      question: "How is --max-time converted?",
      answer:
        "As signal: AbortSignal.timeout(milliseconds). The request is aborted with a TimeoutError if it takes longer, which matches curl giving up after the whole transfer exceeds the limit.",
    },
  ],
};
