import type { ToolContent } from "@/content/types";

export const envJsonContent: ToolContent = {
  howToUse: [
    "Choose a direction, then paste a .env file or a flat JSON object into the input panel. The converted result appears on the right as you type.",
    "Going from .env to JSON, comments and blank lines are dropped, quotes are removed, escapes inside double quotes are expanded and multi-line values such as PEM keys are joined back into one string. Malformed lines and unterminated quotes are reported with their line number.",
    "Going from JSON to .env, each value is quoted only as much as it needs: plain values stay bare, values with spaces, # or $ get single quotes, and values with newlines get double quotes with \\n escapes, so the file reads back unchanged.",
    "Useful for loading local configuration into a secrets manager or CI variables that take JSON, or for turning a JSON payload back into a file your app can load. Nothing is uploaded, which matters for files full of credentials.",
  ],
  examples: [
    {
      title: ".env to JSON",
      note: "Comments go, the export prefix is ignored and quotes are removed.",
      input: `# Database
export DB_HOST=localhost
DB_PORT=5432 # default
APP_NAME='Example App'`,
      output: `{
  "DB_HOST": "localhost",
  "DB_PORT": "5432",
  "APP_NAME": "Example App"
}`,
    },
    {
      title: "Multi-line and escaped values",
      note: "Double quotes expand \\n; a quoted value can span lines.",
      input: `GREETING="Hello\\nWorld"
CERT="-----BEGIN CERT-----
MIIB
-----END CERT-----"`,
      output: `{
  "GREETING": "Hello\\nWorld",
  "CERT": "-----BEGIN CERT-----\\nMIIB\\n-----END CERT-----"
}`,
    },
    {
      title: "JSON to .env",
      note: "Numbers and booleans become strings; null becomes an empty value.",
      input: '{"PORT":8080,"DEBUG":false,"TITLE":"My app","TOKEN":null}',
      output: `PORT=8080
DEBUG=false
TITLE='My app'
TOKEN=`,
    },
  ],
  faq: [
    {
      question: "What happens when a key appears twice?",
      answer:
        "The last value wins, which is what the Node dotenv parser, Docker Compose and python-dotenv all do when reading a file. The tool lists every duplicate with both line numbers, because a repeated key is almost always a copy-paste mistake rather than an intentional override.",
    },
    {
      question: "Are ${VAR} references expanded?",
      answer:
        "No. References are kept exactly as written. Whether they expand depends on the loader: Docker Compose and python-dotenv expand them, the core Node dotenv package does not, and the values usually come from the environment of the machine running the app, which this tool cannot see.",
    },
    {
      question: "What is the difference between single and double quotes in a .env file?",
      answer:
        "Single-quoted values are taken literally: a backslash, a # or a $ stays as it is. Double-quoted values expand escapes such as \\n for a newline and \\t for a tab. Both kinds of quote let a value contain spaces, a # that is not a comment, or several lines.",
    },
    {
      question: "When does # start a comment?",
      answer:
        "A whole line starting with # is a comment. In an unquoted value, # starts a comment at the very beginning of the value or after a space, so PORT=3000 # web gives 3000 while TAG=v1#beta keeps the hash. To store a value that begins with #, such as a colour code, wrap it in quotes.",
    },
    {
      question: "Why are nested JSON objects rejected?",
      answer:
        "A .env file is a flat list of string variables, so it has no way to represent an object or an array. Flatten the structure first, for example into DB_HOST and DB_PORT, or store the nested part as a single JSON string value.",
    },
    {
      question: "Do all dotenv loaders read the generated file the same way?",
      answer:
        "For bare and single-quoted values, yes. Double quotes are only used for values containing a newline or a single quote. Every common loader understands the \\n escape, but the core Node dotenv package does not unescape \\\" or \\\\, so a value containing both a single and a double quote may need checking if that is your loader.",
    },
  ],
};
