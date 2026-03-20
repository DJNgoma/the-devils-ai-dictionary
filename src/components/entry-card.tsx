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
    <article className="surface group h-full p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{entry.letter}</Badge>
        <Badge>{difficultyLabels[entry.difficulty]}</Badge>
        <Badge>{technicalDepthLabels[entry.technicalDepth]}</Badge>
        {entry.isVendorTerm ? <Badge tone="success">Vendor term</Badge> : null}
      </div>
      <div className="mt-5 space-y-4">
        <div>
          <Link
            href={`/dictionary/${entry.slug}`}
            className="font-display text-2xl font-semibold tracking-tight text-foreground group-hover:text-accent"
          >
            {entry.title}
          </Link>
          <p className="mt-2 text-base leading-7 text-foreground-soft">
            {entry.devilDefinition}
          </p>
        </div>
        {!compact ? (
          <p className="text-sm leading-7 text-foreground-soft/90">
            {entry.plainDefinition}
          </p>
        ) : null}
        {entry.warningLabel ? (
          <p className="rounded-2xl border border-dashed border-danger/30 bg-[color:rgba(166,59,50,0.06)] px-4 py-3 text-sm leading-6 text-danger">
            {entry.warningLabel}
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
    </article>
  );
}
