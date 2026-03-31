"use client";

import Link from "next/link";
import { Index } from "flexsearch";
import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppSheet } from "@/components/app-sheet";
import { EntryCard } from "@/components/entry-card";
import type { SearchableEntry } from "@/lib/content";
import {
  areDirectoryExplorerStatesEqual,
  normalizeDirectoryExplorerState,
  serializeDirectoryExplorerState,
} from "@/lib/directory-explorer-state";
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

type ActiveFilterKey =
  | "query"
  | "category"
  | "difficulty"
  | "vendor"
  | "depth"
  | "letter";

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
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [activeDifficulty, setActiveDifficulty] = useState(initialDifficulty);
  const [activeVendor, setActiveVendor] = useState(initialVendor);
  const [activeDepth, setActiveDepth] = useState(initialDepth);
  const [activeLetter, setActiveLetter] = useState(initialLetter);
  const [results, setResults] = useState<SearchableEntry[]>(entries);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const trimmedQuery = query.trim();
  const deferredQuery = useDeferredValue(trimmedQuery);
  const searchStoreRef = useRef<EntryIndexStore | null>(null);
  const syncOriginRef = useRef<"local" | "url">("url");
  const searchParamState = normalizeDirectoryExplorerState(searchParams, {
    categorySlugs: categories.map((category) => category.slug),
    mode,
  });

  useEffect(() => {
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

  const applySearchParamState = useEffectEvent(
    (
      nextState: ReturnType<typeof normalizeDirectoryExplorerState>,
    ) => {
      const currentState = {
        query: trimmedQuery,
        category: activeCategory,
        difficulty: activeDifficulty,
        vendor: activeVendor,
        depth: activeDepth,
        letter: activeLetter,
      };

      if (areDirectoryExplorerStatesEqual(currentState, nextState)) {
        return;
      }

      syncOriginRef.current = "url";

      if (nextState.query !== currentState.query) {
        setQuery(nextState.query);
      }

      if (nextState.category !== currentState.category) {
        setActiveCategory(nextState.category);
      }

      if (nextState.difficulty !== currentState.difficulty) {
        setActiveDifficulty(nextState.difficulty);
      }

      if (nextState.vendor !== currentState.vendor) {
        setActiveVendor(nextState.vendor);
      }

      if (nextState.depth !== currentState.depth) {
        setActiveDepth(nextState.depth);
      }

      if (nextState.letter !== currentState.letter) {
        setActiveLetter(nextState.letter);
      }
    },
  );

  useEffect(() => {
    applySearchParamState(searchParamState);
  }, [searchParamState]);

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

  const markLocalSync = () => {
    syncOriginRef.current = "local";
  };

  useEffect(() => {
    const currentState = {
      query: trimmedQuery,
      category: activeCategory,
      difficulty: activeDifficulty,
      vendor: activeVendor,
      depth: activeDepth,
      letter: activeLetter,
    };
    const nextSearch = serializeDirectoryExplorerState(
      currentState,
      mode,
    );
    const stateMatchesUrl = areDirectoryExplorerStatesEqual(
      currentState,
      searchParamState,
    );
    const currentSearch = searchParams.toString();

    if (syncOriginRef.current === "url" && !stateMatchesUrl) {
      return;
    }

    if (nextSearch === currentSearch) {
      return;
    }

    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [
    activeCategory,
    activeDepth,
    activeDifficulty,
    activeLetter,
    activeVendor,
    mode,
    pathname,
    router,
    searchParamState,
    searchParams,
    trimmedQuery,
  ]);

  const clearFilters = () => {
    markLocalSync();
    startTransition(() => {
      setQuery("");
      setActiveCategory("all");
      setActiveDifficulty("all");
      setActiveVendor("all");
      setActiveDepth("all");
      setActiveLetter("all");
    });
  };

  const clearFilter = (key: ActiveFilterKey) => {
    markLocalSync();

    switch (key) {
      case "query":
        setQuery("");
        return;
      case "category":
        setActiveCategory("all");
        return;
      case "difficulty":
        setActiveDifficulty("all");
        return;
      case "vendor":
        setActiveVendor("all");
        return;
      case "depth":
        setActiveDepth("all");
        return;
      case "letter":
        setActiveLetter("all");
        return;
    }
  };

  const grouped = groupByLetter(results);
  const filterIsActive =
    Boolean(deferredQuery) ||
    activeCategory !== "all" ||
    activeDifficulty !== "all" ||
    activeVendor !== "all" ||
    activeDepth !== "all" ||
    activeLetter !== "all";
  const activeFilterCount =
    (trimmedQuery ? 1 : 0) +
    (activeCategory !== "all" ? 1 : 0) +
    (activeDifficulty !== "all" ? 1 : 0) +
    (activeVendor !== "all" ? 1 : 0) +
    (activeDepth !== "all" ? 1 : 0) +
    (activeLetter !== "all" ? 1 : 0);
  const activeFilters = [
    trimmedQuery
      ? {
          key: "query",
          label: `Search: ${trimmedQuery}`,
        }
      : null,
    activeCategory !== "all"
      ? {
          key: "category",
          label:
            categories.find((category) => category.slug === activeCategory)?.title ??
            "Category",
        }
      : null,
    activeDifficulty !== "all"
      ? {
          key: "difficulty",
          label: difficultyLabels[activeDifficulty as keyof typeof difficultyLabels],
        }
      : null,
    activeVendor !== "all"
      ? {
          key: "vendor",
          label: activeVendor === "vendor" ? "Vendor only" : "No vendor terms",
        }
      : null,
    activeDepth !== "all"
      ? {
          key: "depth",
          label:
            technicalDepthLabels[activeDepth as keyof typeof technicalDepthLabels],
        }
      : null,
    activeLetter !== "all"
      ? {
          key: "letter",
          label: `Letter ${activeLetter}`,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: ActiveFilterKey;
    label: string;
  }>;

  return (
    <section className="space-y-8">
      <div className="surface-strong p-4 sm:p-6">
        <div className="space-y-4 md:hidden">
          <label className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-soft">
              Search
            </span>
            <input
              type="search"
              value={query}
              autoComplete="off"
              inputMode="search"
              onChange={(event) => {
                const nextValue = event.target.value;
                syncOriginRef.current = "local";
                startTransition(() => setQuery(nextValue));
              }}
              placeholder="Search by term, alias, category, or explanation"
              className="field-input text-base placeholder:text-foreground-soft/80"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsFiltersOpen(true)}
              className="button button-secondary"
            >
              Filters
              {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
            {filterIsActive ? (
              <button
                type="button"
                onClick={clearFilters}
                className="button button-ghost"
              >
                Clear all
              </button>
            ) : null}
          </div>

          {activeFilters.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => clearFilter(filter.key)}
                  className="chip chip-accent"
                >
                  {filter.label} x
                </button>
              ))}
            </div>
          ) : null}

          {mode === "dictionary" ? (
            <div className="border-t border-line pt-4">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-soft">
                Browse by letter
              </p>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {["all", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")].map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => {
                      syncOriginRef.current = "local";
                      setActiveLetter(letter);
                    }}
                    className={cn(
                      "chip shrink-0 whitespace-nowrap",
                      activeLetter === letter && "chip-accent border-accent",
                    )}
                  >
                    {letter === "all" ? "All letters" : letter}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="hidden gap-5 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <label className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-soft">
              Search
            </span>
            <input
              type="search"
              value={query}
              autoComplete="off"
              inputMode="search"
              onChange={(event) => {
                const nextValue = event.target.value;
                syncOriginRef.current = "local";
                startTransition(() => setQuery(nextValue));
              }}
              placeholder="Search by term, alias, category, or explanation"
              className="field-input"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <FilterSelect
              label="Category"
              value={activeCategory}
              onChange={(value) => {
                syncOriginRef.current = "local";
                setActiveCategory(value);
              }}
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
              onChange={(value) => {
                syncOriginRef.current = "local";
                setActiveDifficulty(value);
              }}
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
              onChange={(value) => {
                syncOriginRef.current = "local";
                setActiveVendor(value);
              }}
              options={[
                { value: "all", label: "All terms" },
                { value: "vendor", label: "Vendor/product only" },
                { value: "non-vendor", label: "Exclude vendor terms" },
              ]}
            />
            <FilterSelect
              label="Technical depth"
              value={activeDepth}
              onChange={(value) => {
                syncOriginRef.current = "local";
                setActiveDepth(value);
              }}
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
                className="button button-secondary w-full"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>

        {mode === "dictionary" ? (
          <div className="mt-5 hidden border-t border-line pt-5 md:block">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-soft">
              Browse by letter
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["all", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")].map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => {
                    syncOriginRef.current = "local";
                    setActiveLetter(letter);
                  }}
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

      <AppSheet
        id={`${mode}-filters`}
        open={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        title="Refine results"
        description="Adjust category, difficulty, vendor, and depth for this index."
      >
        <div className="grid gap-4">
          <FilterSelect
            label="Category"
            value={activeCategory}
            onChange={(value) => {
              syncOriginRef.current = "local";
              setActiveCategory(value);
            }}
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
            onChange={(value) => {
              syncOriginRef.current = "local";
              setActiveDifficulty(value);
            }}
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
            onChange={(value) => {
              syncOriginRef.current = "local";
              setActiveVendor(value);
            }}
            options={[
              { value: "all", label: "All terms" },
              { value: "vendor", label: "Vendor/product only" },
              { value: "non-vendor", label: "Exclude vendor terms" },
            ]}
          />
          <FilterSelect
            label="Technical depth"
            value={activeDepth}
            onChange={(value) => {
              syncOriginRef.current = "local";
              setActiveDepth(value);
            }}
            options={[
              { value: "all", label: "Any depth" },
              ...Object.entries(technicalDepthLabels).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsFiltersOpen(false)}
              className="button button-primary"
            >
              Done
            </button>
            <button
              type="button"
              onClick={() => {
                clearFilters();
                setIsFiltersOpen(false);
              }}
              className="button button-secondary"
            >
              Clear all
            </button>
          </div>
        </div>
      </AppSheet>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground-soft" aria-live="polite">
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
            className="button button-primary mt-6"
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
        className="field-select"
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
