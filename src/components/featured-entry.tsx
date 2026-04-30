import Link from "next/link";
import { EntryShareButton } from "@/components/entry-share-button";
import { OpenInIPhoneAppButton } from "@/components/open-in-iphone-app-button";
import { SaveWordButton } from "@/components/save-place-button";
import type { Entry } from "@/lib/content";

type TodayWordCardProps = {
  entry: Entry | null;
};

export function TodayWordCard({ entry }: TodayWordCardProps) {
  if (!entry) {
    return null;
  }

  return (
    <section className="today-word-rail" aria-labelledby="word-of-day-heading">
      <div className="today-word-rail__copy">
        <p className="page-kicker">Word of the day</p>
        <h2 id="word-of-day-heading" className="today-word-rail__title">
          {entry.title}
        </h2>
        <p className="mt-5 max-w-2xl text-xl leading-9 text-foreground">
          {entry.devilDefinition}
        </p>
        <p className="mt-5 max-w-2xl text-base leading-8 text-foreground-soft">
          {entry.plainDefinition}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/dictionary/${entry.slug}`}
            className="button button-primary"
          >
            Read today&apos;s word
          </Link>
          <SaveWordButton
            slug={entry.slug}
            href={`/dictionary/${entry.slug}`}
            title={entry.title}
            description={entry.devilDefinition.trim()}
          />
          <EntryShareButton
            slug={entry.slug}
            href={`/dictionary/${entry.slug}`}
            title={entry.title}
            definition={entry.devilDefinition.trim()}
          />
          <OpenInIPhoneAppButton slug={entry.slug} />
        </div>
      </div>
      <aside className="today-word-rail__meta" aria-label="Word of the day filing">
        <span className="chip chip-accent">{entry.letter}</span>
        {entry.categories.slice(0, 2).map((category) => (
          <span key={category} className="chip">
            {category}
          </span>
        ))}
      </aside>
    </section>
  );
}

export const FeaturedEntry = TodayWordCard;
