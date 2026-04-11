"use client";

import { useSavedWords } from "@/components/bookmark-provider";
import { cn } from "@/lib/utils";

type SaveWordButtonProps = {
  slug: string;
  href: string;
  title: string;
  description?: string;
  className?: string;
};

export function SaveWordButton({
  slug,
  href,
  title,
  description,
  className,
}: SaveWordButtonProps) {
  const { isReady, isSavedWord, removeWord, saveWord } = useSavedWords();
  const isSaved = isSavedWord(slug);

  return (
    <button
      type="button"
      onClick={() => {
        if (isSaved) {
          removeWord(slug);
        } else {
          saveWord({ slug, href, title, description });
        }
      }}
      className={cn(
        "button",
        isSaved
          ? "border border-accent bg-accent-soft text-accent"
          : "button-secondary hover:border-accent hover:text-accent",
        className,
      )}
      aria-pressed={isSaved}
      disabled={!isReady}
    >
      {isSaved ? "Remove from saved words" : "Save this word"}
    </button>
  );
}
