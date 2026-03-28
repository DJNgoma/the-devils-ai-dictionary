"use client";

import { useBookmark } from "@/components/bookmark-provider";
import { cn } from "@/lib/utils";

type SavePlaceButtonProps = {
  href: string;
  title: string;
  label: string;
  description?: string;
  className?: string;
};

export function SavePlaceButton({
  href,
  title,
  label,
  description,
  className,
}: SavePlaceButtonProps) {
  const { isReady, savedPlace, savePlace, clearPlace } = useBookmark();
  const isCurrentPlace = savedPlace?.href === href;

  return (
    <button
      type="button"
      onClick={() => {
        if (isCurrentPlace) {
          clearPlace();
        } else {
          savePlace({ href, title, label, description });
        }
      }}
      className={cn(
        "button",
        isCurrentPlace
          ? "border border-accent bg-accent-soft text-accent"
          : "button-secondary hover:border-accent hover:text-accent",
        className,
      )}
      aria-pressed={isCurrentPlace}
      disabled={!isReady}
    >
      {isCurrentPlace ? "Unsave this place" : "Save this place"}
    </button>
  );
}
