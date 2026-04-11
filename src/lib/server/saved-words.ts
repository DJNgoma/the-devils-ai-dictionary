import type { D1DatabaseLike } from "@/lib/server/cloudflare-context";

export type SavedWord = {
  description?: string | null;
  href: string;
  savedAt: string;
  slug: string;
  title: string;
};

export type SavedWordRecord = SavedWord & {
  updatedAt: string;
};

export type SavedWordsSyncMetadata = {
  lastSyncedAt: string | null;
  savedWordCount: number;
};

type SavedWordsSyncMetadataRow = {
  lastSyncedAt: string | null;
  savedWordCount: number | string | null;
};

function normalizeSyncTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/u.test(value)) {
    return `${value.replace(" ", "T")}Z`;
  }

  return value;
}

function normalizeSavedWord(word: SavedWord) {
  return {
    description: word.description?.trim() || null,
    href: word.href.trim(),
    savedAt: word.savedAt.trim(),
    slug: word.slug.trim(),
    title: word.title.trim(),
  };
}

export async function listSavedWords(
  database: D1DatabaseLike,
  userId: string,
) {
  const result = await database
    .prepare(
      `
        SELECT
          slug,
          href,
          title,
          description,
          saved_at AS savedAt,
          updated_at AS updatedAt
        FROM saved_words
        WHERE user_id = ?
        ORDER BY saved_at DESC, updated_at DESC
      `,
    )
    .bind(userId)
    .all<SavedWordRecord>();

  return result.results;
}

export async function getSavedWordsSyncMetadata(
  database: D1DatabaseLike,
  userId: string,
): Promise<SavedWordsSyncMetadata> {
  const result = await database
    .prepare(
      `
        SELECT
          CAST(COUNT(*) AS INTEGER) AS savedWordCount,
          COALESCE(MAX(updated_at), MAX(saved_at)) AS lastSyncedAt
        FROM saved_words
        WHERE user_id = ?
      `,
    )
    .bind(userId)
    .first<SavedWordsSyncMetadataRow>();

  return {
    lastSyncedAt: normalizeSyncTimestamp(result?.lastSyncedAt ?? null),
    savedWordCount:
      typeof result?.savedWordCount === "number"
        ? result.savedWordCount
        : Number(result?.savedWordCount ?? 0),
  };
}

export async function upsertSavedWords(
  database: D1DatabaseLike,
  userId: string,
  words: SavedWord[],
) {
  const deduped = new Map<string, SavedWord>();

  for (const word of words) {
    const normalized = normalizeSavedWord(word);
    const existing = deduped.get(normalized.slug);

    if (!existing || normalized.savedAt >= existing.savedAt) {
      deduped.set(normalized.slug, normalized);
    }
  }

  for (const word of deduped.values()) {
    await database
      .prepare(
        `
          INSERT INTO saved_words (
            user_id,
            slug,
            href,
            title,
            description,
            saved_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(user_id, slug) DO UPDATE SET
            href = excluded.href,
            title = excluded.title,
            description = excluded.description,
            saved_at = CASE
              WHEN excluded.saved_at > saved_words.saved_at THEN excluded.saved_at
              ELSE saved_words.saved_at
            END,
            updated_at = datetime('now')
        `,
      )
      .bind(
        userId,
        word.slug,
        word.href,
        word.title,
        word.description,
        word.savedAt,
      )
      .run();
  }

  return listSavedWords(database, userId);
}

export async function replaceSavedWords(
  database: D1DatabaseLike,
  userId: string,
  words: SavedWord[],
) {
  await clearSavedWords(database, userId);

  if (words.length === 0) {
    return [];
  }

  return upsertSavedWords(database, userId, words);
}

export async function upsertSavedWord(
  database: D1DatabaseLike,
  userId: string,
  word: SavedWord,
) {
  const normalized = normalizeSavedWord(word);

  await database
    .prepare(
      `
        INSERT INTO saved_words (
          user_id,
          slug,
          href,
          title,
          description,
          saved_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(user_id, slug) DO UPDATE SET
          href = excluded.href,
          title = excluded.title,
          description = excluded.description,
          saved_at = CASE
            WHEN excluded.saved_at > saved_words.saved_at THEN excluded.saved_at
            ELSE saved_words.saved_at
          END,
          updated_at = datetime('now')
      `,
    )
    .bind(
      userId,
      normalized.slug,
      normalized.href,
      normalized.title,
      normalized.description,
      normalized.savedAt,
    )
    .run();

  return normalized;
}

export async function deleteSavedWord(
  database: D1DatabaseLike,
  userId: string,
  slug: string,
) {
  await database
    .prepare(
      `
        DELETE FROM saved_words
        WHERE user_id = ?
          AND slug = ?
      `,
    )
    .bind(userId, slug)
    .run();
}

export async function clearSavedWords(
  database: D1DatabaseLike,
  userId: string,
) {
  await database
    .prepare(
      `
        DELETE FROM saved_words
        WHERE user_id = ?
      `,
    )
    .bind(userId)
    .run();
}
