import Link from "next/link";
import { Badge } from "@/components/badge";
import type { SearchableEntry } from "@/lib/content";

type FeaturedEntryProps = {
  entry: SearchableEntry;
};

export function FeaturedEntry({ entry }: FeaturedEntryProps) {
  return (
    <section className="surface-strong overflow-hidden p-6 sm:p-8">
      <div className="editorial-grid items-start gap-8">
        <div>
          <p className="page-kicker">Featured term</p>
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
              className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white hover:translate-y-[-1px] hover:opacity-92"
            >
              Read the entry
            </Link>
            <Link
              href="/dictionary"
              className="rounded-full border border-line px-5 py-3 text-sm font-medium text-foreground hover:border-accent hover:text-accent"
            >
              Browse the dictionary
            </Link>
          </div>
        </div>
        <aside className="surface h-full p-5">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-foreground-soft">
            Quick read
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="accent">{entry.letter}</Badge>
            <Badge>{entry.categories[0]}</Badge>
            {entry.isVendorTerm ? <Badge tone="success">Vendor term</Badge> : null}
          </div>
          {entry.warningLabel ? (
            <p className="mt-5 rounded-2xl border border-dashed border-danger/30 bg-[color:rgba(166,59,50,0.06)] px-4 py-3 text-sm leading-6 text-danger">
              {entry.warningLabel}
            </p>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
