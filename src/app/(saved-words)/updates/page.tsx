import Link from "next/link";
import { getLatestAddedBatch, getPublishedEntryBatches } from "@/lib/content";
import { buildMetadata } from "@/lib/metadata";
import { formatDate } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Recently added",
  description:
    "Browse the newest AI dictionary entries by publish date, with each editorial batch grouped together.",
  path: "/updates",
});

function wordLabel(count: number) {
  return count === 1 ? "word" : "words";
}

export default async function UpdatesPage() {
  const [latestBatch, batches] = await Promise.all([
    getLatestAddedBatch(),
    getPublishedEntryBatches(),
  ]);

  return (
    <div className="reading-shell space-y-12">
      <section className="space-y-5">
        <p className="page-kicker">Recently added</p>
        <h1 className="page-title">New words, newest first</h1>
        <p className="page-intro">
          A running editorial log for the dictionary. Each group shows the words
          first published on that date, so larger drops are visible beyond the
          homepage preview.
        </p>
        <p className="text-sm leading-7 text-foreground-soft">
          Latest batch: {latestBatch.count} new {wordLabel(latestBatch.count)}{" "}
          added {formatDate(latestBatch.publishedAt)}.
        </p>
      </section>

      <div className="space-y-8">
        {batches.map((batch) => (
          <section key={batch.publishedAt} className="surface p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="labelled-rule">{formatDate(batch.publishedAt)}</div>
                <p className="mt-3 text-sm leading-7 text-foreground-soft">
                  {batch.count} new {wordLabel(batch.count)}
                </p>
              </div>
              <span className="chip chip-accent">
                {batch.count} {wordLabel(batch.count)}
              </span>
            </div>

            <div className="mt-5 divide-y divide-line">
              {batch.entries.map((entry) => (
                <Link
                  key={entry.slug}
                  href={`/dictionary/${entry.slug}`}
                  className="group block py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-xl font-semibold tracking-tight text-foreground group-hover:text-accent">
                      {entry.title}
                    </span>
                    <span className="font-mono text-xs uppercase tracking-[0.18em] text-foreground-soft">
                      {entry.letter}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-foreground-soft">
                    {entry.devilDefinition}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
