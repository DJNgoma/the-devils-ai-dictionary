"use client";

import Link from "next/link";
import { useSavedWords } from "@/components/bookmark-provider";
import { cn } from "@/lib/utils";

type ResumeReadingCardProps = {
  className?: string;
  hideIfCurrentHref?: string;
  compact?: boolean;
};

function formatSavedAt(savedAt: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(savedAt));
  } catch {
    return "";
  }
}

export function ResumeReadingCard({
  className,
  hideIfCurrentHref,
  compact = false,
}: ResumeReadingCardProps) {
  const { isReady, savedWords, clearWords } = useSavedWords();
  const visibleWords = savedWords.filter((word) => word.href !== hideIfCurrentHref);

  if (!isReady || visibleWords.length === 0) {
    return null;
  }

  return (
    <div className={cn("surface p-4 sm:p-5", compact && "p-4", className)}>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-soft">
        Saved words
      </p>
      <div className="mt-3 space-y-3">
        <p className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Pick up where you left off.
        </p>
        <p className="max-w-2xl text-sm leading-7 text-foreground-soft">
          {visibleWords.length === 1
            ? "One saved word is waiting."
            : `${visibleWords.length} saved words are waiting. Nice restraint, or at least a paper trail.`}
        </p>
        <ul className="space-y-3">
          {visibleWords.slice(0, 3).map((word) => (
            <li key={word.slug} className="rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3">
              <Link href={word.href} className="font-display text-lg font-semibold tracking-tight text-foreground hover:text-accent">
                {word.title}
              </Link>
              {word.description ? (
                <p className="mt-1 text-sm leading-7 text-foreground-soft">
                  {word.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/saved" className="button button-primary">
          Open saved words
        </Link>
        <button
          type="button"
          onClick={clearWords}
          className="button button-secondary"
        >
          Clear all
        </button>
      </div>
      <p className="mt-4 text-xs text-foreground-soft">
        Saved locally on this device{visibleWords[0]?.savedAt ? ` on ${formatSavedAt(visibleWords[0].savedAt)}` : ""}.
      </p>
    </div>
  );
}
