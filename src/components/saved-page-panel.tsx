"use client";

import Link from "next/link";
import { useSavedWords } from "@/components/bookmark-provider";

export function SavedPagePanel() {
  const { isReady, savedWords, removeWord, clearWords } = useSavedWords();

  if (!isReady) {
    return (
      <div className="surface p-5 sm:p-6">
        <p className="page-kicker">Saved</p>
        <p className="mt-3 text-sm leading-7 text-foreground-soft">
          Checking this device for saved words.
        </p>
      </div>
    );
  }

  if (savedWords.length === 0) {
    return (
      <div className="surface-strong p-6 sm:p-8">
        <p className="page-kicker">Nothing saved yet</p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
          Save words while you read.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-foreground-soft">
          Saved words stay local to this device until you sign in and sync them.
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
      <div className="surface p-5 sm:p-6">
        <p className="page-kicker">Saved words</p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
          {savedWords.length} saved word{savedWords.length === 1 ? "" : "s"}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-foreground-soft">
          Your saved words live here. Remove what you do not need, or clear the lot if you
          like your reading history tidy enough to frighten a librarian.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dictionary" className="button button-secondary">
            Browse more
          </Link>
          <Link href="/search" className="button button-secondary">
            Search the index
          </Link>
          <button type="button" onClick={clearWords} className="button button-secondary">
            Clear all
          </button>
        </div>
      </div>

      <div className="grid gap-5">
        {savedWords.map((word) => (
          <article key={word.slug} className="surface p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-soft">
                  Saved word
                </p>
                <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                  {word.title}
                </h3>
                {word.description ? (
                  <p className="max-w-3xl text-sm leading-7 text-foreground-soft">
                    {word.description}
                  </p>
                ) : null}
                <p className="text-xs text-foreground-soft">
                  Saved on{" "}
                  {new Intl.DateTimeFormat("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(word.savedAt))}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={word.href} className="button button-primary">
                  Open
                </Link>
                <button
                  type="button"
                  onClick={() => removeWord(word.slug)}
                  className="button button-secondary"
                >
                  Remove
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
