import Link from "next/link";
import { CategoryGrid } from "@/components/category-grid";
import { EntryCard } from "@/components/entry-card";
import { TodayWordCard } from "@/components/featured-entry";
import { LetterGrid } from "@/components/letter-grid";
import { ResumeReadingCard } from "@/components/resume-reading-card";
import { SearchBox } from "@/components/search-box";
import { WebNotificationHeroPrompt } from "@/components/web-notification-settings";
import {
  getCategoryStats,
  getDailyWordSchedule,
  getLetterStats,
  getLatestPublishedAt,
  getMostMisunderstoodEntries,
  getRecentlyAddedEntries,
  getSearchableEntries,
  getTodayWord,
} from "@/lib/content";
import { buildMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import { formatDate } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "A sceptical field guide to AI language",
  description:
    "Browse sharp, plain-English definitions of AI terms, hype words, vendor labels, and operational realities.",
  path: "/",
});

export default async function HomePage() {
  const [
    todayWord,
    todayWordSchedule,
    letters,
    categories,
    latestPublishedAt,
    recentEntries,
    misunderstoodEntries,
    searchable,
  ] =
    await Promise.all([
      getTodayWord(),
      getDailyWordSchedule(),
      getLetterStats(),
      getCategoryStats(),
      getLatestPublishedAt(),
      getRecentlyAddedEntries(),
      getMostMisunderstoodEntries(),
      getSearchableEntries(),
    ]);

  return (
    <div className="page-shell space-y-16 py-10 sm:space-y-20 sm:py-14">
      <section className="surface-strong overflow-hidden px-6 py-10 sm:px-8 sm:py-12">
        <div className="editorial-grid gap-10">
          <div>
            <p className="page-kicker">
              Online book{" "}
              <span className="tracking-normal opacity-60">
                · Updated {formatDate(latestPublishedAt)}
              </span>
            </p>
            <h1 className="page-title mt-4">The Devil&apos;s AI Dictionary</h1>
            <p className="mt-6 max-w-3xl text-xl leading-9 text-foreground">
              A sceptical field guide to the language machines, marketers,
              founders, and consultants use when they want to sound smarter than
              they are.
            </p>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-foreground-soft">
              This is a reading experience for smart non-beginners: short entries,
              dry punchlines, then the useful part. The goal is not to sneer at AI.
              The goal is to separate capability from costume.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/book"
                className="button button-primary"
              >
                Read the book
              </Link>
              <Link
                href="/random"
                className="button button-secondary"
              >
                Random entry
              </Link>
            </div>
            <WebNotificationHeroPrompt />
            <div className="mt-5 inline-flex max-w-2xl flex-wrap items-center gap-3 rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm leading-7 text-foreground-soft">
              <span>Prefer the native iPhone app?</span>
              <a
                href={siteConfig.appStoreUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-accent hover:text-foreground"
              >
                Download it on the App Store
              </a>
            </div>
            <ResumeReadingCard className="mt-6 max-w-2xl" compact hideIfCurrentHref="/" />
          </div>
          <aside className="surface p-5 sm:p-6">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-foreground-soft">
              Why this exists
            </p>
            <p className="mt-4 text-lg leading-8 text-foreground">
              AI jargon is now a tax on clear thought. This book tries to refund
              some of it.
            </p>
            <p className="mt-4 text-sm leading-7 text-foreground-soft">
              Search the collection, jump to a random entry, or read it like a
              contrarian reference book. The entries are written to be useful in
              meetings, product reviews, board decks, and the post-demo walk back.
            </p>
          </aside>
        </div>
        <div className="mt-8">
          <SearchBox defaultValue="" />
        </div>
      </section>

      <TodayWordCard
        entries={searchable}
        schedule={todayWordSchedule}
        initialEntry={todayWord}
      />

      <section className="space-y-5">
        <div className="labelled-rule">Browse by letter</div>
        <LetterGrid letters={letters} />
      </section>

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="labelled-rule">Browse by category</div>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-foreground-soft">
              The site is organised like a reference book, not a product dashboard.
              Start with the slice of the AI conversation you keep hearing badly.
            </p>
          </div>
          <Link href="/categories" className="text-sm text-accent hover:text-foreground">
            View all categories
          </Link>
        </div>
        <CategoryGrid categories={categories} />
      </section>

      <section className="grid gap-8 xl:grid-cols-2">
        <div className="space-y-5">
          <div className="labelled-rule">Recently added</div>
          <p className="text-sm leading-7 text-foreground-soft">
            Last words added {formatDate(latestPublishedAt)}.
          </p>
          <div className="grid gap-5">
            {recentEntries.map((entry) => (
              <EntryCard key={entry.slug} entry={entry} compact />
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <div className="labelled-rule">Most misunderstood</div>
          <div className="grid gap-5">
            {misunderstoodEntries.map((entry) => (
              <EntryCard key={entry.slug} entry={entry} compact />
            ))}
          </div>
        </div>
      </section>

      <section className="surface px-6 py-8 sm:px-8">
        <div className="editorial-grid gap-8">
          <div>
            <div className="labelled-rule">Project note</div>
            <p className="mt-4 text-lg leading-8 text-foreground">
              The editorial stance is simple: be funny enough to stay readable,
              accurate enough to be useful, and sceptical enough to resist vendor
              perfume.
            </p>
          </div>
          <div className="space-y-4 text-sm leading-7 text-foreground-soft">
            <p>
              The collection currently includes {searchable.length} published sample
              entries and is structured to grow without changing the architecture.
            </p>
            <p>
              If a term has a precise technical meaning and a swampier marketing
              meaning, both get named. If a term is mostly branding, that gets named
              too.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
