import { Suspense } from "react";
import { DirectoryExplorer } from "@/components/directory-explorer";
import { getCategoryStats, getSearchableEntries } from "@/lib/content";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Search the dictionary",
  description:
    "Search by term, alias, body text, or category and refine results with editorial filters.",
  path: "/search",
});

export default async function SearchPage() {
  const [entries, categories] = await Promise.all([
    getSearchableEntries(),
    getCategoryStats(),
  ]);

  return (
    <div className="page-shell space-y-10">
      <section className="space-y-5">
        <p className="page-kicker">Search</p>
        <h1 className="page-title">Look up the phrase before it colonises the meeting</h1>
        <p className="page-intro">
          Search is local, fast, and deliberately plain. No semantic mysticism. No
          reranking sermon. Just the entries and their actual words.
        </p>
      </section>

      <Suspense fallback={<DirectoryExplorerFallback />}>
        <DirectoryExplorer
          entries={entries}
          categories={categories.map(({ title, slug }) => ({ title, slug }))}
          mode="search"
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
