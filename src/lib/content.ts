import { cache } from "react";
import {
  getDailyWordSlug,
  getFeaturedEntrySlug,
  type DailyWordSchedule,
} from "@/lib/daily-word";
import generatedData from "@/generated/entries.generated.json";
import type { Difficulty, HypeLevel, TechnicalDepth } from "@/lib/site";
import { slugify } from "@/lib/utils";

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
>;

export type DictionaryCatalogSchedule = DailyWordSchedule & {
  latestPublishedAt: string;
};

/* ---------- pre-computed data (all heavy work done at build time) ---------- */

type GeneratedWebEntry = Omit<Entry, "categorySlugs" | "related" | "url"> & {
  categorySlugs?: string[];
  related?: string[];
  url?: string;
};

type EntryDetailFields = Pick<
  Entry,
  "body" | "note" | "seeAlso" | "translations" | "vendorReferences" | "warningLabel"
>;

const defaultEntryDetails: EntryDetailFields = {
  body: "",
  note: undefined,
  seeAlso: [],
  translations: [],
  vendorReferences: [],
  warningLabel: undefined,
};

const loadEntryDetails = cache(async () => {
  const detailsModule = await import("@/generated/entry-details.generated.json");
  return detailsModule.default as Record<string, Partial<EntryDetailFields>>;
});

function normalizeEntry(entry: GeneratedWebEntry): Entry {
  return {
    ...entry,
    categorySlugs: entry.categorySlugs ?? entry.categories.map((category) => slugify(category)),
    body: entry.body ?? defaultEntryDetails.body,
    note: entry.note ?? defaultEntryDetails.note,
    related: entry.related ?? [],
    seeAlso: entry.seeAlso ?? defaultEntryDetails.seeAlso,
    translations: entry.translations ?? defaultEntryDetails.translations,
    url: entry.url ?? `/dictionary/${entry.slug}`,
    vendorReferences: entry.vendorReferences ?? defaultEntryDetails.vendorReferences,
    warningLabel: entry.warningLabel ?? defaultEntryDetails.warningLabel,
  };
}

async function hydrateEntry(entry: Entry | undefined) {
  if (!entry) {
    return undefined;
  }

  const details = await loadEntryDetails();
  return {
    ...entry,
    ...defaultEntryDetails,
    ...(details[entry.slug] ?? {}),
  };
}

const entries = (generatedData.entries as GeneratedWebEntry[]).map(normalizeEntry);
const entryBySlug = new Map(entries.map((entry) => [entry.slug, entry]));
const entryByTitle = new Map(
  entries.map((entry) => [entry.title.trim().toLowerCase(), entry]),
);
const entryByAlias = new Map<string, Entry>();

for (const entry of entries) {
  for (const alias of entry.aliases) {
    const key = alias.trim().toLowerCase();

    if (key && !entryByAlias.has(key)) {
      entryByAlias.set(key, entry);
    }
  }
}

const dailyWordSchedule: DictionaryCatalogSchedule = {
  dailyWordSlugs: generatedData.dailyWordSlugs as string[],
  dailyWordStartDate: generatedData.dailyWordStartDate as string,
  editorialTimeZone: generatedData.editorialTimeZone as string,
  latestPublishedAt: generatedData.latestPublishedAt as string,
};

/* ---------- public API (all effectively zero-cost reads) ---------- */

export const getAllEntries = cache(async (): Promise<Entry[]> => {
  return entries;
});

export const getEntryBySlug = cache(async (slug: string) => {
  return hydrateEntry(entryBySlug.get(slug));
});

export function resolveEntryReference(reference: string) {
  const trimmed = reference.trim();

  if (!trimmed) {
    return undefined;
  }

  const normalized = trimmed.toLowerCase();

  return (
    entryBySlug.get(trimmed) ??
    entryBySlug.get(slugify(trimmed)) ??
    entryByTitle.get(normalized) ??
    entryByAlias.get(normalized)
  );
}

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

export async function getDailyWordSchedule() {
  return dailyWordSchedule;
}

export async function getTodayWord(referenceDate = new globalThis.Date()) {
  const slug = getDailyWordSlug(dailyWordSchedule, referenceDate);
  return slug ? entryBySlug.get(slug) ?? null : null;
}

export async function getFeaturedEntry() {
  const slug = getFeaturedEntrySlug({
    dailyWordSlugs: generatedData.dailyWordSlugs as string[],
    dailyWordStartDate: generatedData.dailyWordStartDate as string,
    editorialTimeZone: generatedData.editorialTimeZone as string,
    recentSlugs: generatedData.recentSlugs as string[],
    featuredSlug: generatedData.featuredSlug as string,
  });
  const entry = slug ? entryBySlug.get(slug) : null;
  if (!entry) {
    throw new Error(
      `Featured entry "${slug ?? generatedData.featuredSlug}" was not found.`,
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
  }));
}
