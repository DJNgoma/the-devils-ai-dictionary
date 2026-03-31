import Link from "next/link";
import { NewsletterSignupPanel } from "@/components/newsletter-signup-panel";
import { getAllEntries } from "@/lib/content";
import { buildMetadata } from "@/lib/metadata";
import { getWeeklyDigest } from "@/lib/newsletter";
import { siteConfig } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Newsletter",
  description:
    "Join the weekly Tuesday-morning digest for the latest words added to The Devil's AI Dictionary.",
  path: "/newsletter",
});

export const dynamic = "force-dynamic";

export default async function NewsletterPage() {
  const digest = getWeeklyDigest(
    await getAllEntries(),
    siteConfig.editorialTimeZone,
  );

  return (
    <div className="reading-shell space-y-12">
      <section className="space-y-5">
        <p className="page-kicker">Newsletter</p>
        <h1 className="page-title">A weekly digest, not an account system in disguise</h1>
        <p className="page-intro">
          One short email every Tuesday morning with the newest additions to the
          dictionary, linked back to the canonical site pages.
        </p>
      </section>

      <NewsletterSignupPanel
        title="Join the Tuesday-morning digest"
        description="This is the first sign-up surface for the project. It collects an email for the digest and does not pretend to be a reader account."
        sourcePath="/newsletter"
      />

      <section className="grid gap-6 md:grid-cols-3">
        <div className="surface p-5">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Cadence
          </h2>
          <p className="mt-3 text-sm leading-7 text-foreground-soft">
            Tuesday mornings in {siteConfig.editorialTimeZone}. The day stays fixed
            until audience data earns a better argument.
          </p>
        </div>
        <div className="surface p-5">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Scope
          </h2>
          <p className="mt-3 text-sm leading-7 text-foreground-soft">
            The digest covers new words only. Saved places remain local to each device,
            and there is no synced reading account behind the curtain.
          </p>
        </div>
        <div className="surface p-5">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Current preview
          </h2>
          <p className="mt-3 text-sm leading-7 text-foreground-soft">
            This week would currently include {digest.entries.length} new{" "}
            {digest.entries.length === 1 ? "entry" : "entries"}.
          </p>
          <Link
            href="/newsletter/digest"
            className="mt-4 inline-flex text-sm text-accent hover:text-foreground"
          >
            Read the digest preview
          </Link>
        </div>
      </section>
    </div>
  );
}
