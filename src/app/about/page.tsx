import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/layout/Prose";
import { site } from "@/lib/site";
import { TOOLS, toolPath } from "@/lib/tools/registry";

export const metadata: Metadata = {
  title: "About",
  description: `What ${site.name} is, how the tools work, and why nothing you paste ever leaves your browser.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <Prose
      title={`About ${site.name}`}
      intro="A small, deliberately boring set of developer utilities that do their work in your browser and get out of the way."
    >
      <h2>What this is</h2>
      <p>
        {site.name} is a collection of {TOOLS.length} single-purpose tools for
        the jobs that interrupt a working day: pretty-printing a JSON payload,
        decoding a token to see why a request was rejected, checking what a cron
        expression will actually do, converting a manifest between YAML and
        JSON.
      </p>
      <p>
        Each one lives on its own page with the tool at the top and a short
        explainer, worked examples and a FAQ below it, so the page answers the
        follow-up question as well as the immediate one.
      </p>

      <h2>How it works</h2>
      <p>
        Every tool is implemented in JavaScript that runs in your browser tab.
        There is no backend API, no database and no account system. When you
        paste a JWT into the decoder, the decoding happens on your machine; the
        token is never transmitted anywhere. The same is true of every other
        tool on the site.
      </p>
      <p>
        A practical consequence is that the tools keep working offline once a
        page has loaded, and they respond as fast as you can type, because there
        is no network round trip between input and output.
      </p>

      <h2>How it is paid for</h2>
      <p>
        The site is funded by advertising. Ad slots are placed below or beside
        the tool, never in front of it, and their space is reserved in the
        layout from the first paint so nothing jumps around as you work. There
        is no paid tier, and no feature is withheld behind one.
      </p>

      <h2>The tools</h2>
      <ul>
        {TOOLS.map((tool) => (
          <li key={tool.slug}>
            <Link href={toolPath(tool.slug)}>{tool.name}</Link> — {tool.tagline}
          </li>
        ))}
      </ul>

      <h2>Feedback</h2>
      <p>
        Built and maintained by {site.author}. If a tool gets something wrong,
        or there is one you keep wishing were here, email{" "}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
      </p>
    </Prose>
  );
}
