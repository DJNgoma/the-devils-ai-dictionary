"use client";

import Link from "next/link";
import { Index } from "flexsearch";
import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EntryCard } from "@/components/entry-card";
import type { SearchableEntry } from "@/lib/content";
import { difficultyLabels, technicalDepthLabels } from "@/lib/site";
import { cn } from "@/lib/utils";

type DirectoryExplorerProps = {
  entries: SearchableEntry[];
  categories: {
    title: string;
    slug: string;
  }[];
  mode: "dictionary" | "search";
  initialQuery?: string;
  initialCategory?: string;
  initialDifficulty?: string;
  initialVendor?: string;
  initialDepth?: string;
  initialLetter?: string;
};

type EntryIndexStore = {
  index: Index;
  map: Map<string, SearchableEntry>;
};

function groupByLetter(entries: SearchableEntry[]) {
  return entries.reduce<Record<string, SearchableEntry[]>>((groups, entry) => {
    groups[entry.letter] ??= [];
    groups[entry.letter].push(entry);
    return groups;
  }, {});
}

export function DirectoryExplorer({
  entries,
  categories,
  mode,
  initialQuery = "",
  initialCategory = "all",
  initialDifficulty = "all",
  initialVendor = "all",
  initialDepth = "all",
  initialLetter = "all",
}: DirectoryExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? initialQuery);
  const [activeCategory, setActiveCategory] = useState(
    () => searchParams.get("category") ?? initialCategory,
  );
  const [activeDifficulty, setActiveDifficulty] = useState(
    () => searchParams.get("difficulty") ?? initialDifficulty,
  );
  const [activeVendor, setActiveVendor] = useState(
    () => searchParams.get("vendor") ?? initialVendor,
  );
  const [activeDepth, setActiveDepth] = useState(
    () => searchParams.get("depth") ?? initialDepth,
  );
  const [activeLetter, setActiveLetter] = useState(
    () => searchParams.get("letter") ?? initialLetter,
  );
  const [results, setResults] = useState<SearchableEntry[]>(entries);
  const deferredQuery = useDeferredValue(query.trim());
  const searchStoreRef = useRef<EntryIndexStore | null>(null);

  useEffect(() => {
    if (searchStoreRef.current) {
      return;
    }

    const index = new Index({
      tokenize: "forward",
      resolution: 9,
      cache: 50,
    });
    const map = new Map<string, SearchableEntry>();

    for (const entry of entries) {
      index.add(entry.slug, entry.searchText);
      map.set(entry.slug, entry);
    }

    searchStoreRef.current = { index, map };
  }, [entries]);

  useEffect(() => {
    const store = searchStoreRef.current;

    if (!store) {
      return;
    }

    const nextResults = (() => {
      let pool: SearchableEntry[] = entries;

      if (deferredQuery) {
        const ids = store.index.search(deferredQuery, 80) as string[];
        pool = ids
          .map((id) => store.map.get(id))
          .filter((entry): entry is SearchableEntry => Boolean(entry));
      }

      return pool
        .filter((entry) =>
          activeCategory === "all"
            ? true
            : entry.categorySlugs.includes(activeCategory),
        )
        .filter((entry) =>
          activeDifficulty === "all" ? true : entry.difficulty === activeDifficulty,
        )
        .filter((entry) =>
          activeVendor === "all"
            ? true
            : activeVendor === "vendor"
              ? entry.isVendorTerm
              : !entry.isVendorTerm,
        )
        .filter((entry) =>
          activeDepth === "all" ? true : entry.technicalDepth === activeDepth,
        )
        .filter((entry) => (activeLetter === "all" ? true : entry.letter === activeLetter));
    })();

    startTransition(() => {
      setResults(nextResults);
    });
  }, [
    activeCategory,
    activeDepth,
    activeDifficulty,
    activeLetter,
    activeVendor,
    deferredQuery,
    entries,
  ]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set("q", query.trim());
    }

    if (activeCategory !== "all") {
      params.set("category", activeCategory);
    }

    if (activeDifficulty !== "all") {
      params.set("difficulty", activeDifficulty);
    }

    if (activeVendor !== "all") {
      params.set("vendor", activeVendor);
    }

    if (activeDepth !== "all") {
      params.set("depth", activeDepth);
    }

    if (mode === "dictionary" && activeLetter !== "all") {
      params.set("letter", activeLetter);
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [
    activeCategory,
    activeDepth,
    activeDifficulty,
    activeLetter,
    activeVendor,
    mode,
    pathname,
    query,
    router,
  ]);

  const clearFilters = () => {
    startTransition(() => {
      setQuery("");
      setActiveCategory("all");
      setActiveDifficulty("all");
      setActiveVendor("all");
      setActiveDepth("all");
      setActiveLetter("all");
    });
  };

  const grouped = groupByLetter(results);
  const filterIsActive =
    Boolean(deferredQuery) ||
    activeCategory !== "all" ||
    activeDifficulty !== "all" ||
    activeVendor !== "all" ||
    activeDepth !== "all" ||
    activeLetter !== "all";

  return (
    <section className="space-y-8">
      <div className="surface-strong p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <label className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-soft">
              Search
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                const nextValue = event.target.value;
                startTransition(() => setQuery(nextValue));
              }}
              placeholder="Search by term, alias, category, or explanation"
              className="rounded-3xl border border-line bg-surface px-4 py-3 text-base text-foreground placeholder:text-foreground-soft/80 focus:outline-none"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <FilterSelect
              label="Category"
              value={activeCategory}
              onChange={(value) => setActiveCategory(value)}
              options={[
                { value: "all", label: "All categories" },
                ...categories.map((category) => ({
                  value: category.slug,
                  label: category.title,
                })),
              ]}
            />
            <FilterSelect
              label="Difficulty"
              value={activeDifficulty}
              onChange={(value) => setActiveDifficulty(value)}
              options={[
                { value: "all", label: "Any difficulty" },
                ...Object.entries(difficultyLabels).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
            <FilterSelect
              label="Vendor term"
              value={activeVendor}
              onChange={(value) => setActiveVendor(value)}
              options={[
                { value: "all", label: "All terms" },
                { value: "vendor", label: "Vendor/product only" },
                { value: "non-vendor", label: "Exclude vendor terms" },
              ]}
            />
            <FilterSelect
              label="Technical depth"
              value={activeDepth}
              onChange={(value) => setActiveDepth(value)}
              options={[
                { value: "all", label: "Any depth" },
                ...Object.entries(technicalDepthLabels).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="w-full rounded-3xl border border-line px-4 py-3 text-sm font-medium text-foreground hover:border-accent hover:text-accent"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>
        {mode === "dictionary" ? (
          <div className="mt-5 border-t border-line pt-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-soft">
              Browse by letter
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["all", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")].map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => setActiveLetter(letter)}
                  className={cn(
                    "rounded-full border border-line px-3 py-1.5 text-sm text-foreground-soft hover:border-accent hover:text-accent",
                    activeLetter === letter && "border-accent bg-accent-soft text-accent",
                  )}
                >
                  {letter === "all" ? "All" : letter}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground-soft">
          {results.length} {results.length === 1 ? "entry" : "entries"}
          {filterIsActive ? " match your search." : " in the dictionary."}
        </p>
        {isPending ? (
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-soft">
            Updating
          </p>
        ) : null}
      </div>

      {results.length === 0 ? (
        <div className="surface p-8 text-center">
          <p className="font-display text-2xl font-semibold tracking-tight text-foreground">
            No exact match.
          </p>
          <p className="mt-3 text-base leading-7 text-foreground-soft">
            Try a plainer term, remove one of the filters, or jump to a random entry
            and work backwards from there.
          </p>
          <Link
            href="/random"
            className="mt-6 inline-flex rounded-full bg-accent px-5 py-3 text-sm font-medium text-white"
          >
            Random entry
          </Link>
        </div>
      ) : null}

      {mode === "dictionary" && !filterIsActive ? (
        <div className="space-y-10">
          {Object.entries(grouped)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([letter, letterEntries]) => (
              <section key={letter} id={`letter-${letter}`} className="space-y-4">
                <div className="labelled-rule">{letter}</div>
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {letterEntries.map((entry) => (
                    <EntryCard key={entry.slug} entry={entry} compact />
                  ))}
                </div>
              </section>
            ))}
        </div>
      ) : null}

      {filterIsActive ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {results.map((entry) => (
            <EntryCard key={entry.slug} entry={entry} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-soft">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-3xl border border-line bg-surface px-4 py-3 text-sm text-foreground focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
