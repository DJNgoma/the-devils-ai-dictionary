import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import matter from "gray-matter";
import { z } from "zod";
import {
  categoryDefinitions,
  featuredEntrySlug,
  hypeLevelOptions,
  technicalDepthOptions,
  type Difficulty,
  type HypeLevel,
  type TechnicalDepth,
} from "@/lib/site";
import { slugify, uniqueBy } from "@/lib/utils";

const entriesDirectory = path.join(process.cwd(), "content", "entries");
const categoryTitleSet = new Set<string>(
  categoryDefinitions.map(({ title }) => title),
);

const translationSchema = z.object({
  label: z.string(),
  text: z.string(),
});

const entryFrontmatterSchema = z.object({
  title: z.string(),
  slug: z.string(),
  letter: z
    .string()
    .min(1)
    .max(1)
    .transform((value) => value.toUpperCase()),
  categories: z.array(z.string()).nonempty(),
  aliases: z.array(z.string()).default([]),
  devilDefinition: z.string(),
  plainDefinition: z.string(),
  whyExists: z.string(),
  misuse: z.string(),
  practicalMeaning: z.string(),
  example: z.string(),
  askNext: z.array(z.string()).nonempty(),
  related: z.array(z.string()).default([]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  technicalDepth: z.enum(technicalDepthOptions),
  hypeLevel: z.enum(hypeLevelOptions),
  isVendorTerm: z.boolean().default(false),
  publishedAt: z.string(),
  updatedAt: z.string(),
  warningLabel: z.string().optional(),
  vendorReferences: z.array(z.string()).default([]),
  note: z.string().optional(),
  tags: z.array(z.string()).default([]),
  misunderstoodScore: z.number().int().min(1).max(5).default(3),
  translations: z.array(translationSchema).default([]),
  diagram: z
    .enum(["rag", "embeddings", "context-window", "function-calling", "mcp"])
    .optional(),
});

export type Entry = z.infer<typeof entryFrontmatterSchema> & {
  body: string;
  categorySlugs: string[];
  url: string;
  searchText: string;
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

function validateCategories(categories: string[], slug: string) {
  for (const category of categories) {
    if (!categoryTitleSet.has(category)) {
      throw new Error(
        `Unknown category "${category}" in ${slug}. Use one of the defined category titles.`,
      );
    }
  }
}

function buildSearchText(frontmatter: z.infer<typeof entryFrontmatterSchema>) {
  return [
    frontmatter.title,
    frontmatter.aliases.join(" "),
    frontmatter.categories.join(" "),
    frontmatter.tags.join(" "),
    frontmatter.devilDefinition,
    frontmatter.plainDefinition,
    frontmatter.whyExists,
    frontmatter.misuse,
    frontmatter.practicalMeaning,
    frontmatter.example,
    frontmatter.askNext.join(" "),
    frontmatter.note ?? "",
    frontmatter.vendorReferences.join(" "),
  ]
    .join(" ")
    .trim();
}

async function readEntryFile(filename: string): Promise<Entry> {
  const source = await fs.readFile(path.join(entriesDirectory, filename), "utf8");
  const { data, content } = matter(source);
  const parsed = entryFrontmatterSchema.parse(data);

  validateCategories(parsed.categories, parsed.slug);

  return {
    ...parsed,
    body: content.trim(),
    categorySlugs: parsed.categories.map((category) => slugify(category)),
    url: `/dictionary/${parsed.slug}`,
    searchText: buildSearchText(parsed),
  };
}

export const getAllEntries = cache(async () => {
  const files = (await fs.readdir(entriesDirectory))
    .filter((file) => file.endsWith(".mdx"))
    .sort();

  const entries = await Promise.all(files.map(readEntryFile));

  return entries.sort((left, right) => left.title.localeCompare(right.title));
});

export const getEntryBySlug = cache(async (slug: string) => {
  const entries = await getAllEntries();
  return entries.find((entry) => entry.slug === slug);
});

export async function getRelatedEntries(entry: Entry, limit = 3) {
  const entries = await getAllEntries();
  const manual = entry.related
    .map((slug) => entries.find((candidate) => candidate.slug === slug))
    .filter((candidate): candidate is Entry => Boolean(candidate));

  const scored = entries
    .filter((candidate) => candidate.slug !== entry.slug)
    .map((candidate) => {
      let score = 0;

      const sharedCategories = candidate.categories.filter((category) =>
        entry.categories.includes(category),
      ).length;
      const sharedTags = candidate.tags.filter((tag) =>
        entry.tags.includes(tag),
      ).length;

      score += sharedCategories * 4;
      score += sharedTags * 2;

      if (candidate.isVendorTerm === entry.isVendorTerm) {
        score += 1;
      }

      if (candidate.technicalDepth === entry.technicalDepth) {
        score += 1;
      }

      if (candidate.difficulty === entry.difficulty) {
        score += 1;
      }

      return { candidate, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.candidate.title.localeCompare(right.candidate.title);
    })
    .map(({ candidate }) => candidate);

  return uniqueBy([...manual, ...scored], (candidate) => candidate.slug).slice(
    0,
    limit,
  );
}

export async function getRecentlyAddedEntries(limit = 4) {
  const entries = await getAllEntries();

  return [...entries]
    .sort(
      (left, right) =>
        new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
    )
    .slice(0, limit);
}

export async function getMostMisunderstoodEntries(limit = 4) {
  const entries = await getAllEntries();

  return [...entries]
    .sort((left, right) => {
      if (right.misunderstoodScore !== left.misunderstoodScore) {
        return right.misunderstoodScore - left.misunderstoodScore;
      }

      return left.title.localeCompare(right.title);
    })
    .slice(0, limit);
}

export async function getFeaturedEntry() {
  const entry = await getEntryBySlug(featuredEntrySlug);

  if (!entry) {
    throw new Error(`Featured entry "${featuredEntrySlug}" was not found.`);
  }

  return entry;
}

export async function getLetterStats() {
  const entries = await getAllEntries();
  const counts = new Map<string, number>();

  for (const entry of entries) {
    counts.set(entry.letter, (counts.get(entry.letter) ?? 0) + 1);
  }

  return "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => ({
    letter,
    count: counts.get(letter) ?? 0,
    href: `/dictionary?letter=${letter}`,
  }));
}

export async function getCategoryStats() {
  const entries = await getAllEntries();

  return categoryDefinitions.map((category) => {
    const slug = slugify(category.title);
    const matchingEntries = entries.filter((entry) =>
      entry.categorySlugs.includes(slug),
    );

    return {
      ...category,
      slug,
      count: matchingEntries.length,
      sampleTerms: matchingEntries.slice(0, 3).map((entry) => entry.title),
    };
  });
}

export async function getEntriesByCategorySlug(slug: string) {
  const entries = await getAllEntries();

  return entries.filter((entry) => entry.categorySlugs.includes(slug));
}

export async function getSearchableEntries(): Promise<SearchableEntry[]> {
  const entries = await getAllEntries();

  return entries.map((entry) => ({
    aliases: entry.aliases,
    categories: entry.categories,
    categorySlugs: entry.categorySlugs,
    devilDefinition: entry.devilDefinition,
    difficulty: entry.difficulty as Difficulty,
    hypeLevel: entry.hypeLevel as HypeLevel,
    isVendorTerm: entry.isVendorTerm,
    letter: entry.letter,
    plainDefinition: entry.plainDefinition,
    slug: entry.slug,
    technicalDepth: entry.technicalDepth as TechnicalDepth,
    title: entry.title,
    warningLabel: entry.warningLabel,
    searchText: entry.searchText,
  }));
}
