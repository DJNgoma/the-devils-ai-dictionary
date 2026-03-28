"use client";

import Link from "next/link";
import { useBookmark } from "@/components/bookmark-provider";
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
  const { isReady, savedPlace, clearPlace } = useBookmark();

  if (!isReady || !savedPlace || savedPlace.href === hideIfCurrentHref) {
    return null;
  }

  return (
    <div className={cn("surface p-4 sm:p-5", compact && "p-4", className)}>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-soft">
        Saved place
      </p>
      <div className="mt-3 space-y-2">
        <p className="font-display text-2xl font-semibold tracking-tight text-foreground">
          {savedPlace.title}
        </p>
        <p className="text-sm text-foreground-soft">{savedPlace.label}</p>
        {savedPlace.description ? (
          <p className="max-w-2xl text-sm leading-7 text-foreground-soft">
            {savedPlace.description}
          </p>
        ) : null}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={savedPlace.href}
          className="button button-primary"
        >
          Resume reading
        </Link>
        <button
          type="button"
          onClick={clearPlace}
          className="button button-secondary"
        >
          Clear saved place
        </button>
      </div>
      <p className="mt-4 text-xs text-foreground-soft">
        Saved locally on this device{savedPlace.savedAt ? ` on ${formatSavedAt(savedPlace.savedAt)}` : ""}.
      </p>
    </div>
  );
}
