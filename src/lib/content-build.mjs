import { readFileSync } from "node:fs";
import {
  categoryDefinitions,
  difficultyOptions,
  hypeLevelOptions,
  technicalDepthOptions,
} from "./content-catalog.mjs";

const categoryTitleSet = new Set(categoryDefinitions.map((category) => category.title));
const difficultySet = new Set(difficultyOptions);
const technicalDepthSet = new Set(technicalDepthOptions);
const hypeLevelSet = new Set(hypeLevelOptions);
const termDiagramDefinitions = JSON.parse(
  readFileSync(new URL("./term-diagrams.json", import.meta.url), "utf8"),
);
const diagramSet = new Set(Object.keys(termDiagramDefinitions));

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isValidDateString(value) {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function sortTimestamp(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function slugifyReference(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createEntryReferenceResolver(entries) {
  const entryBySlug = new Map(entries.map((entry) => [entry.slug, entry]));
  const entryByTitle = new Map(
    entries.map((entry) => [entry.title.trim().toLowerCase(), entry]),
  );
  const entryByAlias = new Map();

  for (const entry of entries) {
    for (const alias of entry.aliases ?? []) {
      const key = alias.trim().toLowerCase();

      if (key && !entryByAlias.has(key)) {
        entryByAlias.set(key, entry);
      }
    }
  }

  return (reference, { excludeSlug } = {}) => {
    const trimmed = String(reference ?? "").trim();

    if (!trimmed) {
      return undefined;
    }

    const normalized = trimmed.toLowerCase();
    const match =
      entryBySlug.get(trimmed) ??
      entryBySlug.get(slugifyReference(trimmed)) ??
      entryByTitle.get(normalized) ??
      entryByAlias.get(normalized);

    if (!match || match.slug === excludeSlug) {
      return undefined;
    }

    return match;
  };
}

export function buildResolvedEntryReferences(entry, field, resolveEntryReference) {
  return (entry[field] ?? []).map((label) => {
    const match = resolveEntryReference(label, { excludeSlug: entry.slug });
    return match ? { label, entrySlug: match.slug } : { label };
  });
}

export function collectUnresolvedEntryReferences(entries, fields = ["seeAlso", "vendorReferences"]) {
  const resolveEntryReference = createEntryReferenceResolver(entries);
  const unresolved = [];

  for (const entry of entries) {
    for (const field of fields) {
      for (const label of entry[field] ?? []) {
        if (!resolveEntryReference(label, { excludeSlug: entry.slug })) {
          unresolved.push({
            entrySlug: entry.slug,
            field,
            label,
            slug: slugifyReference(label),
          });
        }
      }
    }
  }

  return unresolved;
}

export function compareMisunderstoodEntries(left, right) {
  if (right.misunderstoodScore !== left.misunderstoodScore) {
    return right.misunderstoodScore - left.misunderstoodScore;
  }

  const updatedDifference = sortTimestamp(right.updatedAt) - sortTimestamp(left.updatedAt);
  if (updatedDifference !== 0) {
    return updatedDifference;
  }

  const publishedDifference = sortTimestamp(right.publishedAt) - sortTimestamp(left.publishedAt);
  if (publishedDifference !== 0) {
    return publishedDifference;
  }

  const titleDifference = String(left.title ?? "").localeCompare(String(right.title ?? ""));
  if (titleDifference !== 0) {
    return titleDifference;
  }

  return String(left.slug ?? "").localeCompare(String(right.slug ?? ""));
}

export function buildSearchText(entry) {
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

export function collectEntryValidationErrors(
  entry,
  {
    knownSlugs,
  } = {},
) {
  const errors = [];
  const requireString = (field) => {
    if (!isNonEmptyString(entry[field])) {
      errors.push(`Missing required field "${field}"`);
    }
  };
  const validateOptionalStringArray = (field) => {
    if (entry[field] === undefined) {
      return;
    }

    if (!isStringArray(entry[field])) {
      errors.push(`Field "${field}" must be an array of non-empty strings`);
    }
  };

  requireString("title");
  requireString("slug");
  requireString("letter");
  requireString("devilDefinition");
  requireString("plainDefinition");
  requireString("whyExists");
  requireString("misuse");
  requireString("practicalMeaning");
  requireString("example");
  requireString("publishedAt");
  requireString("updatedAt");
  requireString("difficulty");
  requireString("technicalDepth");
  requireString("hypeLevel");

  if (isNonEmptyString(entry.letter)) {
    if (entry.letter.length === 1) {
      entry.letter = entry.letter.toUpperCase();
    } else {
      errors.push(`Field "letter" must be exactly one character, got "${entry.letter}"`);
    }
  }

  if (!isValidDateString(entry.publishedAt)) {
    errors.push('Field "publishedAt" must be a valid ISO date string');
  }

  if (!isValidDateString(entry.updatedAt)) {
    errors.push('Field "updatedAt" must be a valid ISO date string');
  }

  if (!difficultySet.has(entry.difficulty)) {
    errors.push(`Invalid difficulty "${entry.difficulty}"`);
  }

  if (!technicalDepthSet.has(entry.technicalDepth)) {
    errors.push(`Invalid technicalDepth "${entry.technicalDepth}"`);
  }

  if (!hypeLevelSet.has(entry.hypeLevel)) {
    errors.push(`Invalid hypeLevel "${entry.hypeLevel}"`);
  }

  if (
    entry.misunderstoodScore !== undefined &&
    (!Number.isInteger(entry.misunderstoodScore) ||
      entry.misunderstoodScore < 1 ||
      entry.misunderstoodScore > 5)
  ) {
    errors.push('Field "misunderstoodScore" must be an integer from 1 to 5');
  }

  if (!Array.isArray(entry.categories) || entry.categories.length === 0) {
    errors.push('Field "categories" must be a non-empty array');
  } else {
    for (const category of entry.categories) {
      if (!isNonEmptyString(category)) {
        errors.push('Field "categories" must contain only non-empty strings');
        continue;
      }

      if (!categoryTitleSet.has(category)) {
        errors.push(`Unknown category "${category}". Valid: ${[...categoryTitleSet].join(", ")}`);
      }
    }
  }

  if (!Array.isArray(entry.askNext) || entry.askNext.length === 0) {
    errors.push('Field "askNext" must be a non-empty array');
  } else if (!entry.askNext.every(isNonEmptyString)) {
    errors.push('Field "askNext" must contain only non-empty strings');
  }

  validateOptionalStringArray("aliases");
  validateOptionalStringArray("related");
  validateOptionalStringArray("seeAlso");
  validateOptionalStringArray("vendorReferences");
  validateOptionalStringArray("tags");

  if (entry.translations !== undefined) {
    if (
      !Array.isArray(entry.translations) ||
      !entry.translations.every(
        (translation) =>
          translation &&
          typeof translation === "object" &&
          isNonEmptyString(translation.label) &&
          isNonEmptyString(translation.text),
      )
    ) {
      errors.push(
        'Field "translations" must be an array of { label, text } objects with non-empty strings',
      );
    }
  }

  if (entry.diagram !== undefined && !diagramSet.has(entry.diagram)) {
    errors.push(`Invalid diagram "${entry.diagram}"`);
  }

  if (knownSlugs && Array.isArray(entry.related)) {
    for (const relatedSlug of entry.related) {
      if (isNonEmptyString(relatedSlug) && !knownSlugs.has(relatedSlug)) {
        errors.push(`Unknown related slug "${relatedSlug}"`);
      }
    }
  }

  return errors;
}

export function assertValidEntry(
  entry,
  {
    filename = "entry",
    knownSlugs,
  } = {},
) {
  const errors = collectEntryValidationErrors(entry, { knownSlugs });

  if (errors.length > 0) {
    throw new Error(`Validation failed for ${filename}:\n  - ${errors.join("\n  - ")}`);
  }
}

export function scoreRelatedEntries(entries) {
  const entryBySlug = new Map(entries.map((entry) => [entry.slug, entry]));

  for (const entry of entries) {
    const manual = (entry.related ?? [])
      .map((slug) => entryBySlug.get(slug))
      .filter(Boolean)
      .map((relatedEntry) => relatedEntry.slug);

    const scored = entries
      .filter((candidate) => candidate.slug !== entry.slug)
      .map((candidate) => {
        let score = 0;
        const sharedCategories = candidate.categories.filter((category) =>
          entry.categories.includes(category),
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
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        const leftTitle = entryBySlug.get(left.slug)?.title ?? "";
        const rightTitle = entryBySlug.get(right.slug)?.title ?? "";
        return leftTitle.localeCompare(rightTitle);
      })
      .map(({ slug }) => slug);

    const seen = new Set();
    const result = [];

    for (const slug of [...manual, ...scored]) {
      if (!seen.has(slug)) {
        seen.add(slug);
        result.push(slug);
      }

      if (result.length >= 3) {
        break;
      }
    }

    entry._relatedSlugs = result;
  }
}
