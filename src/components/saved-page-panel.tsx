"use client";

import Link from "next/link";
import { ResumeReadingCard } from "@/components/resume-reading-card";
import { useBookmark } from "@/components/bookmark-provider";

export function SavedPagePanel() {
  const { isReady, savedPlace } = useBookmark();

  if (!isReady) {
    return (
      <div className="surface p-5 sm:p-6">
        <p className="page-kicker">Saved</p>
        <p className="mt-3 text-sm leading-7 text-foreground-soft">
          Checking this device for a saved place.
        </p>
      </div>
    );
  }

  if (!savedPlace) {
    return (
      <div className="surface-strong p-6 sm:p-8">
        <p className="page-kicker">Nothing saved yet</p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
          Save a place while you read.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-foreground-soft">
          Saved entries stay local to this device, which is less glamorous than a
          synced reading account and much easier to trust.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dictionary" className="button button-primary">
            Browse entries
          </Link>
          <Link href="/search" className="button button-secondary">
            Search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ResumeReadingCard />
      <div className="surface p-5 sm:p-6">
        <p className="page-kicker">Next move</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/dictionary" className="button button-secondary">
            Browse more
          </Link>
          <Link href="/search" className="button button-secondary">
            Search the index
          </Link>
        </div>
      </div>
    </div>
  );
}
