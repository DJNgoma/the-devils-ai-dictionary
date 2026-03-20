import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const entriesDirectory = path.join(root, "content", "entries");
const outputDirectory = path.join(root, "src", "generated");
const outputFile = path.join(outputDirectory, "entries.generated.json");

/* ---------- helpers (mirrored from src/lib) ---------- */

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildSearchText(entry) {
  return [
    entry.title,
    (entry.aliases ?? []).join(" "),
    (entry.categories ?? []).join(" "),
    (entry.tags ?? []).join(" "),
    entry.devilDefinition ?? "",
    entry.plainDefinition ?? "",
    entry.whyExists ?? "",
    entry.misuse ?? "",
    entry.practicalMeaning ?? "",
    entry.example ?? "",
    (entry.askNext ?? []).join(" "),
    (entry.seeAlso ?? []).join(" "),
    entry.note ?? "",
    (entry.vendorReferences ?? []).join(" "),
  ]
    .join(" ")
    .trim();
}

/* ---------- category definitions (mirrored from src/lib/site.ts) ---------- */

const categoryDefinitions = [
  {
    title: "Core concepts",
    description:
      "Terms people use as if they were self-explanatory, usually before the definitions start fraying.",
  },
  {
    title: "Cultural terms",
    description:
      "The social weirdness around AI: belief, taste, cringe, status games, and the internet behaving as it usually does when handed a new machine.",
  },
  {
    title: "Model building",
    description:
      "How models are trained, tuned, evaluated, and occasionally overpraised.",
  },
  {
    title: "Model usage",
    description:
      "What it means to actually run a model in production, where invoices and latency live.",
  },
  {
    title: "Agents and workflows",
    description:
      "Automation patterns, orchestration, and the difference between useful autonomy and stagecraft.",
  },
  {
    title: "Retrieval and memory",
    description:
      "How systems fetch context, store traces, and pretend they remember you.",
  },
  {
    title: "Product and vendor terms",
    description:
      "Company names, product labels, and the branding haze around them.",
  },
  {
    title: "Safety and evaluation",
    description:
      "Guardrails, tests, preferences, and the uncomfortable gap between lab scores and reality.",
  },
  {
    title: "Infrastructure and deployment",
    description:
      "The machinery underneath the demo: compute, serving, throughput, and operational trade-offs.",
  },
  {
    title: "Economics and operations of AI",
    description:
      "Cost, labour, incentives, and the very unmagical business of running AI systems.",
  },
];

const categoryTitleSet = new Set(categoryDefinitions.map((c) => c.title));
const featuredEntrySlug = "agentic-ai";

/* ---------- validation ---------- */

const DIFFICULTY_VALUES = new Set(["beginner", "intermediate", "advanced"]);
const TECHNICAL_DEPTH_VALUES = new Set(["low", "medium", "high"]);
const HYPE_LEVEL_VALUES = new Set(["low", "medium", "high", "severe"]);

function validateEntry(entry, filename) {
  const errors = [];
  const require = (field) => {
    if (entry[field] === undefined || entry[field] === null || entry[field] === "") {
      errors.push(`Missing required field "${field}"`);
    }
  };

  require("title");
  require("slug");
  require("letter");
  require("devilDefinition");
  require("plainDefinition");
  require("whyExists");
  require("misuse");
  require("practicalMeaning");
  require("example");

  if (!Array.isArray(entry.categories) || entry.categories.length === 0) {
    errors.push('Field "categories" must be a non-empty array');
  } else {
    for (const cat of entry.categories) {
      if (!categoryTitleSet.has(cat)) {
        errors.push(`Unknown category "${cat}". Valid: ${[...categoryTitleSet].join(", ")}`);
      }
    }
  }

  if (!Array.isArray(entry.askNext) || entry.askNext.length === 0) {
    errors.push('Field "askNext" must be a non-empty array');
  }

  if (entry.difficulty && !DIFFICULTY_VALUES.has(entry.difficulty)) {
    errors.push(`Invalid difficulty "${entry.difficulty}"`);
  }
  if (entry.technicalDepth && !TECHNICAL_DEPTH_VALUES.has(entry.technicalDepth)) {
    errors.push(`Invalid technicalDepth "${entry.technicalDepth}"`);
  }
  if (entry.hypeLevel && !HYPE_LEVEL_VALUES.has(entry.hypeLevel)) {
    errors.push(`Invalid hypeLevel "${entry.hypeLevel}"`);
  }

  if (typeof entry.letter === "string" && entry.letter.length === 1) {
    entry.letter = entry.letter.toUpperCase();
  } else if (typeof entry.letter === "string") {
    errors.push(`Field "letter" must be exactly one character, got "${entry.letter}"`);
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed for ${filename}:\n  - ${errors.join("\n  - ")}`);
  }
}

/* ---------- related entries scoring (pre-computed at build time) ---------- */

function scoreRelatedEntries(entries) {
  const entryBySlug = new Map(entries.map((e) => [e.slug, e]));

  for (const entry of entries) {
    const manual = (entry.related ?? [])
      .map((slug) => entryBySlug.get(slug))
      .filter(Boolean)
      .map((e) => e.slug);

    const scored = entries
      .filter((c) => c.slug !== entry.slug)
      .map((candidate) => {
        let score = 0;
        const sharedCategories = candidate.categories.filter((cat) =>
          entry.categories.includes(cat),
        ).length;
        const sharedTags = (candidate.tags ?? []).filter((tag) =>
          (entry.tags ?? []).includes(tag),
        ).length;

        score += sharedCategories * 4;
        score += sharedTags * 2;
        if (candidate.isVendorTerm === entry.isVendorTerm) score += 1;
        if (candidate.technicalDepth === entry.technicalDepth) score += 1;
        if (candidate.difficulty === entry.difficulty) score += 1;

        return { slug: candidate.slug, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aTitle = entryBySlug.get(a.slug)?.title ?? "";
        const bTitle = entryBySlug.get(b.slug)?.title ?? "";
        return aTitle.localeCompare(bTitle);
      })
      .map(({ slug }) => slug);

    // Unique, manual first, limit 3
    const seen = new Set();
    const result = [];
    for (const slug of [...manual, ...scored]) {
      if (!seen.has(slug)) {
        seen.add(slug);
        result.push(slug);
      }
      if (result.length >= 3) break;
    }

    entry._relatedSlugs = result;
  }
}

/* ---------- main ---------- */

async function buildEntryIndex() {
  const files = (await fs.readdir(entriesDirectory))
    .filter((file) => file.endsWith(".mdx"))
    .sort();

  const rawEntries = await Promise.all(
    files.map(async (filename) => {
      const source = await fs.readFile(path.join(entriesDirectory, filename), "utf8");
      const { data, content } = matter(source);

      // Apply defaults
      const entry = {
        ...data,
        aliases: data.aliases ?? [],
        related: data.related ?? [],
        seeAlso: data.seeAlso ?? [],
        vendorReferences: data.vendorReferences ?? [],
        tags: data.tags ?? [],
        isVendorTerm: data.isVendorTerm ?? false,
        misunderstoodScore: data.misunderstoodScore ?? 3,
        translations: data.translations ?? [],
        body: content.trim(),
      };

      validateEntry(entry, filename);
      return entry;
    }),
  );

  // Pre-compute related entries (needs all entries present)
  scoreRelatedEntries(rawEntries);

  // Enrich entries with pre-computed fields
  const entries = rawEntries.map((entry) => ({
    ...entry,
    categorySlugs: entry.categories.map((cat) => slugify(cat)),
    url: `/dictionary/${entry.slug}`,
    searchText: buildSearchText(entry),
    relatedSlugs: entry._relatedSlugs,
  }));

  // Remove temporary field
  for (const entry of entries) {
    delete entry._relatedSlugs;
  }

  // Sort alphabetically (the default order for getAllEntries)
  entries.sort((a, b) => a.title.localeCompare(b.title));

  // Pre-compute derived collections
  const recentEntries = [...entries]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 4)
    .map((e) => e.slug);

  const misunderstoodEntries = [...entries]
    .sort((a, b) => {
      if (b.misunderstoodScore !== a.misunderstoodScore) {
        return b.misunderstoodScore - a.misunderstoodScore;
      }
      return a.title.localeCompare(b.title);
    })
    .slice(0, 4)
    .map((e) => e.slug);

  // Letter stats
  const letterCounts = {};
  for (const entry of entries) {
    letterCounts[entry.letter] = (letterCounts[entry.letter] ?? 0) + 1;
  }
  const letterStats = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => ({
    letter,
    count: letterCounts[letter] ?? 0,
    href: `/dictionary?letter=${letter}`,
  }));

  // Category stats
  const categoryStats = categoryDefinitions.map((category) => {
    const catSlug = slugify(category.title);
    const matching = entries.filter((e) => e.categorySlugs.includes(catSlug));
    return {
      ...category,
      slug: catSlug,
      count: matching.length,
      sampleTerms: matching.slice(0, 3).map((e) => e.title),
    };
  });

  const featuredSlug = entries.find((e) => e.slug === featuredEntrySlug)?.slug;
  if (!featuredSlug) {
    throw new Error(`Featured entry "${featuredEntrySlug}" not found in entries`);
  }

  const output = {
    entries,
    recentSlugs: recentEntries,
    misunderstoodSlugs: misunderstoodEntries,
    letterStats,
    categoryStats,
    featuredSlug,
  };

  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(outputFile, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(
    `Generated ${entries.length} dictionary entries into ${path.relative(root, outputFile)}`,
  );
}

buildEntryIndex().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
