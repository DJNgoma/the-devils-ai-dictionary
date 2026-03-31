import { cache } from "react";
import generatedData from "@/generated/entries.generated.json";
import type { Difficulty, HypeLevel, TechnicalDepth } from "@/lib/site";

/* ---------- types ---------- */

export type Entry = {
  title: string;
  slug: string;
  letter: string;
  categories: string[];
  aliases: string[];
  devilDefinition: string;
  plainDefinition: string;
  whyExists: string;
  misuse: string;
  practicalMeaning: string;
  example: string;
  askNext: string[];
  related: string[];
  seeAlso: string[];
  difficulty: Difficulty;
  technicalDepth: TechnicalDepth;
  hypeLevel: HypeLevel;
  isVendorTerm: boolean;
  publishedAt: string;
  updatedAt: string;
  warningLabel?: string;
  vendorReferences: string[];
  note?: string;
  tags: string[];
  misunderstoodScore: number;
  translations: { label: string; text: string }[];
  diagram?: "rag" | "embeddings" | "context-window" | "function-calling" | "mcp";
  body: string;
  categorySlugs: string[];
  url: string;
  searchText: string;
  relatedSlugs: string[];
};

export type SearchableEntry = Pick<
  Entry,
  | "aliases"
  | "categories"
  | "categorySlugs"
  | "devilDefinition"
  | "difficulty"
  | "hypeLevel"
  | "isVendorTerm"
  | "letter"
  | "plainDefinition"
  | "slug"
  | "technicalDepth"
  | "title"
  | "warningLabel"
> & {
  searchText: string;
};

/* ---------- pre-computed data (all heavy work done at build time) ---------- */

const entries = generatedData.entries as Entry[];
const entryBySlug = new Map(entries.map((entry) => [entry.slug, entry]));

/* ---------- public API (all effectively zero-cost reads) ---------- */

export const getAllEntries = cache(async (): Promise<Entry[]> => {
  return entries;
});

export const getEntryBySlug = cache(async (slug: string) => {
  return entryBySlug.get(slug);
});

export async function getRelatedEntries(entry: Entry, limit = 3) {
  return (entry.relatedSlugs ?? [])
    .slice(0, limit)
    .map((slug) => entryBySlug.get(slug))
    .filter((e): e is Entry => Boolean(e));
}

export async function getRecentlyAddedEntries(_limit = 4) {
  return (generatedData.recentSlugs as string[])
    .slice(0, _limit)
    .map((slug) => entryBySlug.get(slug))
    .filter((e): e is Entry => Boolean(e));
}

export async function getMostMisunderstoodEntries(_limit = 4) {
  return (generatedData.misunderstoodSlugs as string[])
    .slice(0, _limit)
    .map((slug) => entryBySlug.get(slug))
    .filter((e): e is Entry => Boolean(e));
}

export async function getLatestPublishedAt() {
  return generatedData.latestPublishedAt as string;
}

export async function getFeaturedEntry() {
  const entry = entryBySlug.get(generatedData.featuredSlug);
  if (!entry) {
    throw new Error(
      `Featured entry "${generatedData.featuredSlug}" was not found.`,
    );
  }
  return entry;
}

export async function getLetterStats() {
  return generatedData.letterStats as {
    letter: string;
    count: number;
    href: string;
  }[];
}

export async function getCategoryStats() {
  return generatedData.categoryStats as {
    title: string;
    slug: string;
    description: string;
    count: number;
    sampleTerms: string[];
  }[];
}

export async function getEntriesByCategorySlug(slug: string) {
  return entries.filter((entry) => entry.categorySlugs.includes(slug));
}

export async function getSearchableEntries(): Promise<SearchableEntry[]> {
  return entries.map((entry) => ({
    aliases: entry.aliases,
    categories: entry.categories,
    categorySlugs: entry.categorySlugs,
    devilDefinition: entry.devilDefinition,
    difficulty: entry.difficulty,
    hypeLevel: entry.hypeLevel,
    isVendorTerm: entry.isVendorTerm,
    letter: entry.letter,
    plainDefinition: entry.plainDefinition,
    slug: entry.slug,
    technicalDepth: entry.technicalDepth,
    title: entry.title,
    warningLabel: entry.warningLabel,
    searchText: entry.searchText,
  }));
}
