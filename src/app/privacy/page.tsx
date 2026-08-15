import type { Metadata } from "next";
import { Prose } from "@/components/layout/Prose";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${site.name} handles your data: tool input never leaves your browser, and what advertising cookies are used.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <Prose
      title="Privacy policy"
      intro="The short version: the text you paste into a tool never leaves your browser. The longer version covers advertising and analytics, which do involve third parties."
      updated="15 August 2026"
    >
      <h2>Data you enter into the tools</h2>
      <p>
        Every tool on this site runs entirely in your browser. JSON you format,
        tokens you decode, regular expressions you test and text you encode are
        processed locally by JavaScript on your device. This content is{" "}
        <strong>
          never transmitted to us, never written to a server and never stored
        </strong>
        . We have no way to see it.
      </p>
      <p>
        Some tools remember your preferences — the selected theme, for example —
        using your browser&rsquo;s local storage. That data stays on your device
        and is readable only by this site.
      </p>

      <h2>Information collected automatically</h2>
      <p>
        Like almost every website, our hosting provider records standard server
        logs when a page is requested: IP address, browser user-agent, the page
        requested and the time. These logs are used to keep the site running and
        to detect abuse. The site is hosted on Vercel, whose privacy practices
        are described at{" "}
        <a
          href="https://vercel.com/legal/privacy-policy"
          rel="noopener noreferrer"
          target="_blank"
        >
          vercel.com/legal/privacy-policy
        </a>
        .
      </p>
      <p>
        We may use privacy-friendly, aggregate analytics to count page views and
        see which tools are used. This does not build a profile of you and is
        not linked to anything you type into a tool.
      </p>

      <h2>Advertising</h2>
      <p>
        This site displays advertising supplied by Google AdSense in order to
        remain free to use.
      </p>
      <ul>
        <li>
          Google, as a third-party vendor, uses cookies to serve ads on this
          site.
        </li>
        <li>
          Google&rsquo;s use of advertising cookies enables it and its partners
          to serve ads to you based on your visit to this site and other sites
          on the internet.
        </li>
        <li>
          You can opt out of personalised advertising by visiting{" "}
          <a
            href="https://www.google.com/settings/ads"
            rel="noopener noreferrer"
            target="_blank"
          >
            Google Ads Settings
          </a>
          , or opt out of third-party vendor cookies at{" "}
          <a
            href="https://www.aboutads.info/choices/"
            rel="noopener noreferrer"
            target="_blank"
          >
            aboutads.info/choices
          </a>
          .
        </li>
        <li>
          Third-party vendors and ad networks may also serve ads here. We do not
          control the cookies those vendors set.
        </li>
      </ul>
      <p>
        Advertising cookies are set by the ad provider, not by us, and they
        cannot read the content you enter into any tool on this site.
      </p>

      <h2>Your rights</h2>
      <p>
        Because we do not collect or store personal information ourselves, there
        is no account to delete and no dataset of yours for us to export. If you
        are in the EEA or the UK, requests relating to advertising data should
        be directed to the relevant advertising provider, whose policies are
        linked above.
      </p>

      <h2>Children</h2>
      <p>
        This site is intended for software developers and is not directed at
        children under 13. We do not knowingly collect personal information from
        children.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If this policy changes — for example, if a new third-party service is
        added — the date at the top of this page will be updated.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy can be sent to{" "}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
      </p>
    </Prose>
  );
}
