import { Suspense } from "react";
import { DirectoryExplorer } from "@/components/directory-explorer";
import { getCategoryStats, getSearchableEntries } from "@/lib/content";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Dictionary browser",
  description:
    "Browse the AI dictionary by letter, search across entries, and filter by category, depth, and vendor context.",
  path: "/dictionary",
});

type DictionaryPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
    category?: string | string[];
    difficulty?: string | string[];
    vendor?: string | string[];
    depth?: string | string[];
    letter?: string | string[];
  }>;
};

export default async function DictionaryPage(_props: DictionaryPageProps) {
  const [entries, categories] = await Promise.all([
    getSearchableEntries(),
    getCategoryStats(),
  ]);

  return (
    <div className="page-shell space-y-10">
      <section className="space-y-5">
        <p className="page-kicker">Dictionary</p>
        <h1 className="page-title">Browse the terms without the theatre</h1>
        <p className="page-intro">
          Search by term, alias, body text, or category. Then filter by difficulty,
          technical depth, or vendor baggage if the room needs tighter definitions.
        </p>
      </section>

      <Suspense fallback={<DirectoryExplorerFallback />}>
        <DirectoryExplorer
          entries={entries}
          categories={categories.map(({ title, slug }) => ({ title, slug }))}
          mode="dictionary"
        />
      </Suspense>
    </div>
  );
}

function DirectoryExplorerFallback() {
  return (
    <div className="surface p-8 text-center text-sm text-foreground-soft">
      Loading the index.
    </div>
  );
}
