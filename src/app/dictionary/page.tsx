import { Suspense } from "react";
import { DirectoryExplorer } from "@/components/directory-explorer";
import {
  getCategoryStats,
  getDictionaryWordCount,
  getLatestPublishedAt,
  getSearchIndexPath,
  getSearchableEntries,
} from "@/lib/content";
import { buildMetadata } from "@/lib/metadata";
import { formatCount, formatDate } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Dictionary browser",
  description:
    "Browse the AI dictionary by letter, search across entries, and filter by category, depth, and vendor context.",
  path: "/dictionary",
});

export const dynamic = "force-static";

export default async function DictionaryPage() {
  const [entries, categories, latestPublishedAt, searchIndexPath, wordCount] = await Promise.all([
    getSearchableEntries(),
    getCategoryStats(),
    getLatestPublishedAt(),
    getSearchIndexPath(),
    getDictionaryWordCount(),
  ]);
  const wordCountLabel = formatCount(wordCount);
  const wordLabel = wordCount === 1 ? "word" : "words";

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
          {wordCountLabel} published {wordLabel} in the dictionary. Last words added{" "}
          {formatDate(latestPublishedAt)}.
        </p>
      </section>

      <Suspense fallback={<DirectoryExplorerFallback />}>
        <DirectoryExplorer
          entries={entries}
          categories={categories.map(({ title, slug }) => ({ title, slug }))}
          searchIndexPath={searchIndexPath}
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
