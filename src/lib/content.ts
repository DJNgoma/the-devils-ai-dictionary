import { cache } from "react";
import {
  getDailyWordSlug,
  getFeaturedEntrySlug,
  type DailyWordSchedule,
} from "@/lib/daily-word";
import {
  entryDetailShardLoaders,
  type EntryDetailShardKey,
} from "@/generated/entry-detail-shards.generated";
import type { Difficulty, HypeLevel, TechnicalDepth } from "@/lib/site";
import type { TermDiagramKind } from "@/lib/term-diagrams";
import { slugify } from "@/lib/utils";

/* ---------- types ---------- */

export type EntryReference = {
  label: string;
  entrySlug?: string;
};

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
  resolvedSeeAlso: EntryReference[];
  resolvedVendorReferences: EntryReference[];
  note?: string;
  tags: string[];
  misunderstoodScore: number;
  translations: { label: string; text: string }[];
  diagram?: TermDiagramKind;
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
> & {
  seeAlso?: string[];
  vendorReferences?: string[];
};

export type PublishedEntryBatch = {
  publishedAt: string;
  count: number;
  entries: Entry[];
};

type GeneratedPublishedEntryBatch = {
  publishedAt: string;
  count: number;
  slugs: string[];
};

export type DictionaryCatalogSchedule = DailyWordSchedule & {
  latestPublishedAt: string;
};

type GeneratedWebSnapshot = {
  schemaVersion: number;
  catalogVersion: string;
  generatedAt: string;
  entryCount: number;
  entries: GeneratedWebEntry[];
  recentSlugs: string[];
  misunderstoodSlugs: string[];
  letterStats: {
    letter: string;
    count: number;
    href: string;
  }[];
  categoryStats: {
    title: string;
    slug: string;
    description: string;
    count: number;
    sampleTerms: string[];
  }[];
  editorialTimeZone: string;
  dailyWordStartDate: string;
  dailyWordSlugs: string[];
  featuredSlug?: string;
  latestPublishedAt: string;
  publishedEntryBatches: GeneratedPublishedEntryBatch[];
  searchIndexPath?: string;
};

/* ---------- pre-computed data (all heavy work done at build time) ---------- */

type GeneratedWebEntry = Omit<
  Entry,
  | "askNext"
  | "body"
  | "categorySlugs"
  | "example"
  | "misuse"
  | "note"
  | "practicalMeaning"
  | "relatedSlugs"
  | "resolvedSeeAlso"
  | "resolvedVendorReferences"
  | "related"
  | "seeAlso"
  | "translations"
  | "url"
  | "vendorReferences"
  | "whyExists"
  | "warningLabel"
  | "tags"
  | "misunderstoodScore"
> & {
  askNext?: string[];
  body?: string;
  categorySlugs?: string[];
  example?: string;
  misuse?: string;
  note?: string;
  practicalMeaning?: string;
  related?: string[];
  relatedSlugs?: string[];
  resolvedSeeAlso?: EntryReference[];
  resolvedVendorReferences?: EntryReference[];
  seeAlso?: string[];
  translations?: Entry["translations"];
  url?: string;
  vendorReferences?: string[];
  warningLabel?: string;
  whyExists?: string;
  tags?: string[];
  misunderstoodScore?: number;
};

type EntryDetailFields = Pick<
  Entry,
  | "askNext"
  | "body"
  | "example"
  | "misuse"
  | "note"
  | "practicalMeaning"
  | "relatedSlugs"
  | "resolvedSeeAlso"
  | "resolvedVendorReferences"
  | "seeAlso"
  | "translations"
  | "vendorReferences"
  | "whyExists"
  | "warningLabel"
>;

const defaultEntryDetails: EntryDetailFields = {
  askNext: [],
  body: "",
  example: "",
  misuse: "",
  note: undefined,
  practicalMeaning: "",
  relatedSlugs: [],
  resolvedSeeAlso: [],
  resolvedVendorReferences: [],
  seeAlso: [],
  translations: [],
  vendorReferences: [],
  whyExists: "",
  warningLabel: undefined,
};

function entryDetailShardKeyForEntry(entry: Pick<Entry, "letter">) {
  const key = entry.letter.trim().toLowerCase();
  return Object.hasOwn(entryDetailShardLoaders, key)
    ? (key as EntryDetailShardKey)
    : undefined;
}

const loadEntryDetailShard = cache(async (shardKey: EntryDetailShardKey) => {
  const detailsModule = await entryDetailShardLoaders[shardKey]();
  return detailsModule.default as Record<string, Partial<EntryDetailFields>>;
});

function normalizeEntry(entry: GeneratedWebEntry): Entry {
  return {
    ...entry,
    askNext: entry.askNext ?? defaultEntryDetails.askNext,
    categorySlugs: entry.categorySlugs ?? entry.categories.map((category) => slugify(category)),
    body: entry.body ?? defaultEntryDetails.body,
    example: entry.example ?? defaultEntryDetails.example,
    misuse: entry.misuse ?? defaultEntryDetails.misuse,
    note: entry.note ?? defaultEntryDetails.note,
    practicalMeaning: entry.practicalMeaning ?? defaultEntryDetails.practicalMeaning,
    related: entry.related ?? [],
    relatedSlugs: entry.relatedSlugs ?? defaultEntryDetails.relatedSlugs,
    resolvedSeeAlso: entry.resolvedSeeAlso ?? defaultEntryDetails.resolvedSeeAlso,
    resolvedVendorReferences:
      entry.resolvedVendorReferences ?? defaultEntryDetails.resolvedVendorReferences,
    seeAlso: entry.seeAlso ?? defaultEntryDetails.seeAlso,
    translations: entry.translations ?? defaultEntryDetails.translations,
    url: entry.url ?? `/dictionary/${entry.slug}`,
    vendorReferences: entry.vendorReferences ?? defaultEntryDetails.vendorReferences,
    whyExists: entry.whyExists ?? defaultEntryDetails.whyExists,
    warningLabel: entry.warningLabel ?? defaultEntryDetails.warningLabel,
    tags: entry.tags ?? [],
    misunderstoodScore: entry.misunderstoodScore ?? 3,
  };
}

async function hydrateEntry(entry: Entry | undefined) {
  if (!entry) {
    return undefined;
  }

  const shardKey = entryDetailShardKeyForEntry(entry);
  const details = shardKey ? await loadEntryDetailShard(shardKey) : {};
  return {
    ...entry,
    ...defaultEntryDetails,
    ...(details[entry.slug] ?? {}),
  };
}

type ContentState = {
  generatedData: GeneratedWebSnapshot;
  entries: Entry[];
  dictionaryWordCount: number;
  entryBySlug: Map<string, Entry>;
  entryByTitle: Map<string, Entry>;
  entryByAlias: Map<string, Entry>;
  dailyWordSchedule: DictionaryCatalogSchedule;
  publishedEntryBatches: PublishedEntryBatch[];
};

let contentStatePromise: Promise<ContentState> | undefined;

async function loadGeneratedData() {
  const generatedModule = await import("@/generated/entries.web.generated.json");
  return generatedModule.default as GeneratedWebSnapshot;
}

async function loadContentState(): Promise<ContentState> {
  const generatedData = await loadGeneratedData();
  const entries = generatedData.entries.map(normalizeEntry);
  const dictionaryWordCount =
    Number.isInteger(generatedData.entryCount) && generatedData.entryCount > 0
      ? generatedData.entryCount
      : entries.length;
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
    dailyWordSlugs: generatedData.dailyWordSlugs,
    dailyWordStartDate: generatedData.dailyWordStartDate,
    editorialTimeZone: generatedData.editorialTimeZone,
    latestPublishedAt: generatedData.latestPublishedAt,
  };

  const publishedEntryBatches = generatedData.publishedEntryBatches.map((batch) => ({
    publishedAt: batch.publishedAt,
    count: batch.count,
    entries: batch.slugs
      .map((slug) => entryBySlug.get(slug))
      .filter((entry): entry is Entry => Boolean(entry)),
  }));

  return {
    generatedData,
    entries,
    dictionaryWordCount,
    entryBySlug,
    entryByTitle,
    entryByAlias,
    dailyWordSchedule,
    publishedEntryBatches,
  };
}

function getContentState() {
  contentStatePromise ??= loadContentState();
  return contentStatePromise;
}

/* ---------- public API (catalogue reads are lazy to keep Worker startup small) ---------- */

export const getAllEntries = cache(async (): Promise<Entry[]> => {
  const state = await getContentState();
  return state.entries;
});

export async function getDictionaryWordCount() {
  const state = await getContentState();
  return state.dictionaryWordCount;
}

export const getEntryBySlug = cache(async (slug: string) => {
  const state = await getContentState();
  return hydrateEntry(state.entryBySlug.get(slug));
});

export async function resolveEntryReference(reference: string, { excludeSlug }: { excludeSlug?: string } = {}) {
  const state = await getContentState();
  const trimmed = reference.trim();

  if (!trimmed) {
    return undefined;
  }

  const normalized = trimmed.toLowerCase();

  const match =
    state.entryBySlug.get(trimmed) ??
    state.entryBySlug.get(slugify(trimmed)) ??
    state.entryByTitle.get(normalized) ??
    state.entryByAlias.get(normalized);

  if (!match || match.slug === excludeSlug) {
    return undefined;
  }

  return match;
}

export async function getRelatedEntries(entry: Entry, limit = 3) {
  const state = await getContentState();
  return (entry.relatedSlugs ?? [])
    .slice(0, limit)
    .map((slug) => state.entryBySlug.get(slug))
    .filter((e): e is Entry => Boolean(e));
}

export async function getRecentlyAddedEntries(_limit = 4) {
  const state = await getContentState();
  return state.generatedData.recentSlugs
    .slice(0, _limit)
    .map((slug) => state.entryBySlug.get(slug))
    .filter((e): e is Entry => Boolean(e));
}

export async function getLatestAddedBatch(): Promise<PublishedEntryBatch> {
  const state = await getContentState();
  return state.publishedEntryBatches[0] ?? {
    publishedAt: state.generatedData.latestPublishedAt,
    count: 0,
    entries: [],
  };
}

export async function getPublishedEntryBatches() {
  const state = await getContentState();
  return state.publishedEntryBatches;
}

export async function getMostMisunderstoodEntries(_limit = 4) {
  const state = await getContentState();
  return state.generatedData.misunderstoodSlugs
    .slice(0, _limit)
    .map((slug) => state.entryBySlug.get(slug))
    .filter((e): e is Entry => Boolean(e));
}

export async function getLatestPublishedAt() {
  const state = await getContentState();
  return state.generatedData.latestPublishedAt;
}

export async function getDailyWordSchedule() {
  const state = await getContentState();
  return state.dailyWordSchedule;
}

export async function getSearchIndexPath() {
  const state = await getContentState();
  return state.generatedData.searchIndexPath ?? "/catalog/search-index.json";
}

export async function getTodayWord(referenceDate = new globalThis.Date()) {
  const state = await getContentState();
  const slug = getDailyWordSlug(state.dailyWordSchedule, referenceDate);
  return slug ? state.entryBySlug.get(slug) ?? null : null;
}

export async function getFeaturedEntry() {
  const state = await getContentState();
  const slug = getFeaturedEntrySlug({
    dailyWordSlugs: state.generatedData.dailyWordSlugs,
    dailyWordStartDate: state.generatedData.dailyWordStartDate,
    editorialTimeZone: state.generatedData.editorialTimeZone,
    recentSlugs: state.generatedData.recentSlugs,
    featuredSlug: state.generatedData.featuredSlug,
  });
  const entry = slug ? state.entryBySlug.get(slug) : null;
  if (!entry) {
    throw new Error(
      `Featured entry "${slug ?? state.generatedData.featuredSlug}" was not found.`,
    );
  }
  return entry;
}

export async function getLetterStats() {
  const state = await getContentState();
  return state.generatedData.letterStats;
}

export async function getCategoryStats() {
  const state = await getContentState();
  return state.generatedData.categoryStats;
}

export async function getEntriesByCategorySlug(slug: string) {
  const state = await getContentState();
  return state.entries.filter((entry) => entry.categorySlugs.includes(slug));
}

export async function getSearchableEntries(): Promise<SearchableEntry[]> {
  const state = await getContentState();
  return state.entries.map((entry) => ({
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
