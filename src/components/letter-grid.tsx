import Link from "next/link";
import { cn } from "@/lib/utils";

type LetterGridProps = {
  letters: {
    letter: string;
    count: number;
    href: string;
  }[];
};

export function LetterGrid({ letters }: LetterGridProps) {
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-9 lg:grid-cols-[repeat(13,minmax(0,1fr))]">
      {letters.map((item) => {
        const isDisabled = item.count === 0;

        if (isDisabled) {
          return (
            <span
              key={item.letter}
              className="flex aspect-square items-center justify-center rounded-2xl border border-dashed border-line bg-surface text-sm text-foreground-soft/55"
            >
              {item.letter}
            </span>
          );
        }

        return (
          <Link
            key={item.letter}
            href={item.href}
            className={cn(
              "group flex aspect-square flex-col items-center justify-center rounded-2xl border border-line bg-surface text-foreground hover:border-accent hover:text-accent",
            )}
          >
            <span className="font-display text-lg font-semibold">{item.letter}</span>
            <span className="text-[0.65rem] tracking-[0.16em] text-foreground-soft group-hover:text-accent">
              {item.count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
