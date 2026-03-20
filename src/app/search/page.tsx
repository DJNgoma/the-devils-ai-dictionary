import { DirectoryExplorer } from "@/components/directory-explorer";
import { getCategoryStats, getSearchableEntries } from "@/lib/content";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Search the dictionary",
  description:
    "Search by term, alias, body text, or category and refine results with editorial filters.",
  path: "/search",
});

type SearchPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    category?: string | string[];
    difficulty?: string | string[];
    vendor?: string | string[];
    hype?: string | string[];
    depth?: string | string[];
  }>;
};

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
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

      <DirectoryExplorer
        entries={entries}
        categories={categories.map(({ title, slug }) => ({ title, slug }))}
        mode="search"
        initialQuery={firstValue(params.q)}
        initialCategory={firstValue(params.category)}
        initialDifficulty={firstValue(params.difficulty)}
        initialVendor={firstValue(params.vendor)}
        initialHype={firstValue(params.hype)}
        initialDepth={firstValue(params.depth)}
      />
    </div>
  );
}
