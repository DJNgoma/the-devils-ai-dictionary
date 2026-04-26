"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { EntryShareButton } from "@/components/entry-share-button";
import { OpenInIPhoneAppButton } from "@/components/open-in-iphone-app-button";
import { SaveWordButton } from "@/components/save-place-button";
import { getDailyWordSlug, type DailyWordSchedule } from "@/lib/daily-word";
import type { SearchableEntry } from "@/lib/content";

type TodayWordCardProps = {
  entries: SearchableEntry[];
  schedule: DailyWordSchedule;
  initialEntry: SearchableEntry | null;
};

function resolveTodayWordEntry(
  entries: SearchableEntry[],
  schedule: DailyWordSchedule,
  referenceDate: Date = new Date(),
) {
  const slug = getDailyWordSlug(schedule, referenceDate);
  return slug ? entries.find((entry) => entry.slug === slug) ?? null : null;
}

export function TodayWordCard({
  entries,
  schedule,
  initialEntry,
}: TodayWordCardProps) {
  const entry = useSyncExternalStore(
    () => () => {},
    () => resolveTodayWordEntry(entries, schedule) ?? initialEntry,
    () => initialEntry,
  );

  if (!entry) {
    return null;
  }

  return (
    <section className="surface-strong overflow-hidden p-6 sm:p-8">
      <div className="max-w-3xl">
        <p className="page-kicker">Today&apos;s word</p>
        <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
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
            Open current word
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
    </section>
  );
}

export const FeaturedEntry = TodayWordCard;
