"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Badge } from "@/components/badge";
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
      <div className="editorial-grid items-start gap-8">
        <div>
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
            <OpenInIPhoneAppButton slug={entry.slug} />
          </div>
        </div>
        <aside className="surface h-full p-5">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-foreground-soft">
            Daily rotation
          </p>
          <p className="mt-4 text-sm leading-7 text-foreground-soft">
            One shared word across the site and Apple app, cycling through the
            catalogue before it starts repeating itself.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="accent">{entry.letter}</Badge>
            <Badge>{entry.categories[0]}</Badge>
            {entry.isVendorTerm ? <Badge tone="success">Vendor term</Badge> : null}
          </div>
        </aside>
      </div>
    </section>
  );
}

export const FeaturedEntry = TodayWordCard;
