import { buildMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Privacy",
  description:
    "Privacy notes for newsletter sign-up, local saved places, and aggregate analytics on The Devil's AI Dictionary.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="reading-shell space-y-12">
      <section className="space-y-5">
        <p className="page-kicker">Privacy</p>
        <h1 className="page-title">Enough privacy to stay readable</h1>
        <p className="page-intro">
          The site keeps its privacy posture deliberately plain: local saved places,
          aggregate analytics, and email sign-up only when you ask for the digest.
        </p>
      </section>

      <section className="surface-strong p-6 sm:p-8">
        <div className="book-prose">
          <p>
            Saved places live in your browser storage on the device you are using.
            There is no reader account system in this tranche, so there is nothing to
            sync across devices and no password database to maintain.
          </p>
          <p>
            Newsletter sign-up is processed through Buttondown. The site sends your
            email address and the page where you signed up to Buttondown so it can
            run the double opt-in flow and manage subscriptions and unsubscribes.
          </p>
          <p>
            Aggregate site analytics are handled through Cloudflare Web Analytics. The
            intent is page and referrer visibility, not cross-site behaviour tracking
            or product-event theatre.
          </p>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="surface p-5">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Newsletter processor
          </h2>
          <p className="mt-3 text-sm leading-7 text-foreground-soft">
            Buttondown handles subscription confirmation, email delivery, and
            unsubscribes for the weekly digest.
          </p>
        </div>
        <div className="surface p-5">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Analytics
          </h2>
          <p className="mt-3 text-sm leading-7 text-foreground-soft">
            Cloudflare Web Analytics is the privacy-first aggregate layer. No custom
            event tracking is wired in this release.
          </p>
        </div>
        <div className="surface p-5">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Contact
          </h2>
          <p className="mt-3 text-sm leading-7 text-foreground-soft">
            For corrections, terms, or privacy questions, use the public repo at{" "}
            <a
              href={siteConfig.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:text-foreground"
            >
              GitHub
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
