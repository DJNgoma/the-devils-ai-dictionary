import { Suspense } from "react";
import { DirectoryExplorer } from "@/components/directory-explorer";
import {
  getCategoryStats,
  getLatestPublishedAt,
  getSearchableEntries,
} from "@/lib/content";
import { buildMetadata } from "@/lib/metadata";
import { formatDate } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Dictionary browser",
  description:
    "Browse the AI dictionary by letter, search across entries, and filter by category, depth, and vendor context.",
  path: "/dictionary",
});

export default async function DictionaryPage() {
  const [entries, categories, latestPublishedAt] = await Promise.all([
    getSearchableEntries(),
    getCategoryStats(),
    getLatestPublishedAt(),
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
        <p className="text-sm leading-7 text-foreground-soft">
          Last words added {formatDate(latestPublishedAt)}.
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
