import Link from "next/link";
import { getAllEntries } from "@/lib/content";
import { buildMetadata } from "@/lib/metadata";
import { getWeeklyDigest } from "@/lib/newsletter";
import { siteConfig } from "@/lib/site";
import { formatDateRange } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Weekly digest preview",
  description:
    "Preview the current Tuesday-morning newsletter digest for The Devil's AI Dictionary.",
  path: "/newsletter/digest",
});

export const dynamic = "force-dynamic";

export default async function NewsletterDigestPage() {
  const digest = getWeeklyDigest(
    await getAllEntries(),
    siteConfig.editorialTimeZone,
  );

  return (
    <div className="reading-shell space-y-12">
      <section className="space-y-5">
        <p className="page-kicker">Digest preview</p>
        <h1 className="page-title">This week&apos;s Tuesday-morning email</h1>
        <p className="page-intro">
          Manual send preview for the current digest window:{" "}
          {formatDateRange(digest.startDate, digest.endDate)}.
        </p>
      </section>

      <section className="surface-strong p-6 sm:p-8">
        <div className="book-prose">
          <p>
            Subject suggestion: This week&apos;s new words from The Devil&apos;s AI
            Dictionary
          </p>
          <p>
            Intro suggestion: The week produced a few more terms worth translating
            back into English. Here are the new additions, in case the jargon has
            already started roaming the building unescorted.
          </p>
        </div>
      </section>

      {digest.entries.length > 0 ? (
        <section className="space-y-5">
          <div className="labelled-rule">Entries in this run</div>
          <div className="grid gap-4">
            {digest.entries.map((entry) => (
              <article key={entry.slug} className="surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                    {entry.title}
                  </h2>
                  <p className="text-sm text-foreground-soft">{entry.publishedAt}</p>
                </div>
                <p className="mt-3 text-base leading-8 text-foreground-soft">
                  {entry.plainDefinition}
                </p>
                <Link
                  href={entry.url}
                  className="mt-4 inline-flex text-sm text-accent hover:text-foreground"
                >
                  Read the entry
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="surface p-6 sm:p-8">
          <p className="text-base leading-8 text-foreground-soft">
            No new entries have landed in the current digest window yet. The next
            Tuesday run can remain pleasingly short.
          </p>
        </section>
      )}
    </div>
  );
}
