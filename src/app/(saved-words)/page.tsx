import Link from "next/link";
import { CategoryGrid } from "@/components/category-grid";
import { EntryCard } from "@/components/entry-card";
import { LetterGrid } from "@/components/letter-grid";
import { ResumeReadingCard } from "@/components/resume-reading-card";
import { SearchBox } from "@/components/search-box";
import { WebNotificationHeroPrompt } from "@/components/web-notification-settings";
import {
  getCategoryStats,
  getDictionaryWordCount,
  getLatestAddedBatch,
  getLetterStats,
  getLatestPublishedAt,
  getMostMisunderstoodEntries,
  getRecentlyAddedEntries,
} from "@/lib/content";
import { buildMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import { formatCount, formatDate } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "A sceptical field guide to AI language",
  description:
    "Browse sharp, plain-English definitions of AI terms, hype words, vendor labels, and operational realities.",
  path: "/",
});

export default async function HomePage() {
  const [
    wordCount,
    letters,
    categories,
    latestPublishedAt,
    latestAddedBatch,
    recentEntries,
    misunderstoodEntries,
  ] =
    await Promise.all([
      getDictionaryWordCount(),
      getLetterStats(),
      getCategoryStats(),
      getLatestPublishedAt(),
      getLatestAddedBatch(),
      getRecentlyAddedEntries(),
      getMostMisunderstoodEntries(),
    ]);
  const wordCountLabel = formatCount(wordCount);
  const wordLabel = wordCount === 1 ? "word" : "words";

  return (
    <div className="page-shell space-y-16 py-10 sm:space-y-20 sm:py-14">
      <section className="home-hero">
        <div className="home-hero__copy">
          <p className="page-kicker">
            Online book{" "}
            <span className="tracking-normal opacity-60">
              / {wordCountLabel} {wordLabel} / Updated {formatDate(latestPublishedAt)}
            </span>
          </p>
          <h1 className="home-hero__title">
            AI terms arrive overdressed. This strips them for parts.
          </h1>
          <p className="mt-6 max-w-3xl text-xl leading-9 text-foreground">
            The Devil&apos;s AI Dictionary translates vendor labels, model lore,
            and boardroom spells before they start asking for budget.
          </p>
          <p className="mt-5 max-w-2xl text-base leading-8 text-foreground-soft sm:text-lg">
            Read it like a reference book with a raised eyebrow: short entries,
            dry punchlines, then the useful part.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/book"
                className="button button-primary"
              >
                Start the book
              </Link>
              <Link
                href="/random"
                className="button button-secondary"
              >
                Draw a random term
              </Link>
          </div>
          <WebNotificationHeroPrompt />
          <div className="home-native-callout">
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
        <aside className="home-casefile" aria-label="Editorial brief">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
              Case file
            </p>
            <p className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight text-foreground">
              Jargon is a tax on clear thought. This refunds a little.
            </p>
          </div>
          <div className="home-proof-grid">
            <div>
              <span>{wordCountLabel}</span>
              <p>{wordLabel} catalogued</p>
            </div>
            <div>
              <span>{latestAddedBatch.count}</span>
              <p>fresh terms this batch</p>
            </div>
            <div>
              <span>0</span>
              <p>demo-day incense sticks lit</p>
            </div>
          </div>
          <p className="text-sm leading-7 text-foreground-soft">
            Useful in meetings, product reviews, board decks, and the quiet walk
            back after the demo stops being magic.
          </p>
        </aside>
        <div className="home-search">
          <SearchBox defaultValue="" />
        </div>
      </section>

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
          <div className="flex items-center justify-between gap-4">
            <div className="labelled-rule">Recently added</div>
            <Link
              href="/updates"
              className="shrink-0 text-sm text-accent hover:text-foreground"
            >
              View all {latestAddedBatch.count}
            </Link>
          </div>
          <p className="text-sm leading-7 text-foreground-soft">
            {latestAddedBatch.count} new{" "}
            {latestAddedBatch.count === 1 ? "word" : "words"} added{" "}
            {formatDate(latestAddedBatch.publishedAt)}.
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
              The dictionary currently includes {wordCountLabel} published {wordLabel}
              and is structured to grow without changing the architecture.
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
