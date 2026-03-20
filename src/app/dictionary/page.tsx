import { DirectoryExplorer } from "@/components/directory-explorer";
import { getCategoryStats, getSearchableEntries } from "@/lib/content";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Dictionary browser",
  description:
    "Browse the AI dictionary by letter, search across entries, and filter by category, depth, vendor terms, and hype.",
  path: "/dictionary",
});

type DictionaryPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    category?: string | string[];
    difficulty?: string | string[];
    vendor?: string | string[];
    hype?: string | string[];
    depth?: string | string[];
    letter?: string | string[];
  }>;
};

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DictionaryPage({
  searchParams,
}: DictionaryPageProps) {
  const params = await searchParams;
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
          technical depth, vendor baggage, or hype level if the room needs tighter
          definitions.
        </p>
      </section>

      <DirectoryExplorer
        entries={entries}
        categories={categories.map(({ title, slug }) => ({ title, slug }))}
        mode="dictionary"
        initialQuery={firstValue(params.q)}
        initialCategory={firstValue(params.category)}
        initialDifficulty={firstValue(params.difficulty)}
        initialVendor={firstValue(params.vendor)}
        initialHype={firstValue(params.hype)}
        initialDepth={firstValue(params.depth)}
        initialLetter={firstValue(params.letter)}
      />
    </div>
  );
}
