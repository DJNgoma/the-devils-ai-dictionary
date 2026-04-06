import Link from "next/link";
import { Badge } from "@/components/badge";
import { difficultyLabels, technicalDepthLabels } from "@/lib/site";
import type { SearchableEntry } from "@/lib/content";

type EntryCardProps = {
  entry: SearchableEntry;
  compact?: boolean;
};

export function EntryCard({ entry, compact = false }: EntryCardProps) {
  return (
    <Link
      href={`/dictionary/${entry.slug}`}
      className="surface group block h-full p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{entry.letter}</Badge>
        <Badge>{difficultyLabels[entry.difficulty]}</Badge>
        <Badge>{technicalDepthLabels[entry.technicalDepth]}</Badge>
        {entry.isVendorTerm ? <Badge tone="success">Vendor term</Badge> : null}
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <p className="font-display text-[1.38rem] font-semibold tracking-tight text-foreground group-hover:text-accent">
            {entry.title}
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground-soft sm:text-base sm:leading-7">
            {entry.devilDefinition}
          </p>
        </div>
        {!compact ? (
          <p className="hidden text-sm leading-7 text-foreground-soft/90 md:block">
            {entry.plainDefinition}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {entry.categories.map((category) => (
            <span key={category} className="text-xs tracking-wide text-foreground-soft">
              {category}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
