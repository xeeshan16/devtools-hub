import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/layout/Prose";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description: `The terms that apply when you use ${site.name}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <Prose
      title="Terms of use"
      intro={`These terms apply to your use of ${site.name}. By using the site, you agree to them.`}
      updated="15 August 2026"
    >
      <h2>Using the site</h2>
      <p>
        The tools are provided free of charge for your personal and commercial
        use. No account is required and no licence is granted or needed for the
        output you produce with them — anything you paste in, and anything the
        tools give back, remains yours.
      </p>
      <p>
        You agree not to use the site in a way that disrupts it or the
        experience of other users, including attempting to overload the hosting,
        circumvent advertising in an automated fashion, or scrape the pages at a
        volume that degrades availability.
      </p>

      <h2>No warranty</h2>
      <p>
        The tools are provided <strong>as is</strong>, without warranty of any
        kind, express or implied. While they are written carefully and covered
        by automated tests, we do not warrant that any result is accurate,
        complete or fit for a particular purpose. Verify anything that matters
        before relying on it — particularly output used in production systems,
        security decisions or anything involving money.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, {site.author} shall not be
        liable for any loss or damage — including lost data, lost profits, or
        business interruption — arising out of your use of, or inability to use,
        this site or the results it produces.
      </p>

      <h2>Availability and changes</h2>
      <p>
        The site is offered on a best-effort basis and may be changed, suspended
        or discontinued at any time without notice. Tools may be added, altered
        or removed.
      </p>

      <h2>Advertising and third-party links</h2>
      <p>
        This site displays third-party advertising and may link to external
        sites. We do not control and are not responsible for the content,
        products or practices of any third party. See the{" "}
        <Link href="/privacy">privacy policy</Link> for how advertising cookies
        are handled.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The site&rsquo;s design, text and source code are owned by{" "}
        {site.author}. The content you enter into the tools is not.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms can be sent to{" "}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
      </p>
    </Prose>
  );
}
