import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
} from "@/lib/server/cloudflare-context";
import {
  getSavedWordsSyncMetadata,
  deleteSavedWord,
  listSavedWords,
  replaceSavedWords,
  upsertSavedWord,
} from "@/lib/server/saved-words";

type PreparedStatementMock = {
  bind: ReturnType<typeof vi.fn>;
  first: ReturnType<typeof vi.fn>;
  run: ReturnType<typeof vi.fn>;
  all: ReturnType<typeof vi.fn>;
};

function createPreparedStatementMock(): PreparedStatementMock {
  const statement = {
    bind: vi.fn(),
    first: vi.fn(),
    run: vi.fn(),
    all: vi.fn(),
  };

  statement.bind.mockReturnValue(statement);

  return statement;
}

function createDatabaseMock() {
  const statements: Array<{ query: string; statement: PreparedStatementMock }> = [];
  const database: D1DatabaseLike & { prepare: ReturnType<typeof vi.fn> } = {
    prepare: vi.fn((query: string) => {
      const statement = createPreparedStatementMock();
      statements.push({ query, statement });
      return statement as unknown as D1PreparedStatementLike;
    }),
  };

  return { database, statements };
}

describe("saved words helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists saved words for a user", async () => {
    const { database, statements } = createDatabaseMock();
    const savedWords = [
      {
        description: "A software system granted just enough initiative.",
        href: "/dictionary/agent",
        savedAt: "2026-04-11T10:00:00.000Z",
        slug: "agent",
        title: "Agent",
      },
    ];

    database.prepare.mockImplementation((query: string) => {
      const statement = createPreparedStatementMock();
      if (query.includes("FROM saved_words")) {
        statement.all.mockResolvedValue({ results: savedWords });
      }
      statements.push({ query, statement });
      return statement;
    });

    const result = await listSavedWords(database, "user-1");

    expect(result).toEqual(savedWords);
    expect(statements[0]?.query).toContain("ORDER BY saved_at DESC");
    expect(statements[0]?.statement.bind).toHaveBeenCalledWith("user-1");
  });

  it("upserts a single saved word using the user scope", async () => {
    const { database, statements } = createDatabaseMock();
    const word = {
      description: "A software system granted just enough initiative.",
      href: "/dictionary/agent",
      savedAt: "2026-04-11T10:00:00.000Z",
      slug: "agent",
      title: "Agent",
    };

    database.prepare.mockImplementation((query: string) => {
      const statement = createPreparedStatementMock();
      statement.run.mockResolvedValue(undefined);
      statements.push({ query, statement });
      return statement;
    });

    const result = await upsertSavedWord(database, "user-2", word);

    expect(result).toEqual(word);
    expect(statements[0]?.query).toContain("INSERT INTO saved_words");
    expect(statements[0]?.query).toContain("ON CONFLICT(user_id, slug)");
    expect(statements[0]?.statement.bind).toHaveBeenCalledWith(
      "user-2",
      word.slug,
      word.href,
      word.title,
      word.description,
      word.savedAt,
    );
  });

  it("deletes a saved word by user and slug", async () => {
    const { database, statements } = createDatabaseMock();

    database.prepare.mockImplementation((query: string) => {
      const statement = createPreparedStatementMock();
      statement.run.mockResolvedValue(undefined);
      statements.push({ query, statement });
      return statement;
    });

    await deleteSavedWord(database, "user-3", "agent");

    expect(statements[0]?.query).toContain("DELETE FROM saved_words");
    expect(statements[0]?.statement.bind).toHaveBeenCalledWith("user-3", "agent");
  });

  it("reports saved-word sync metadata with an ISO timestamp", async () => {
    const { database, statements } = createDatabaseMock();

    database.prepare.mockImplementation((query: string) => {
      const statement = createPreparedStatementMock();

      if (query.includes("CAST(COUNT(*) AS INTEGER) AS savedWordCount")) {
        statement.first.mockResolvedValue({
          lastSyncedAt: "2026-04-11 10:05:00",
          savedWordCount: 2,
        });
      }

      statements.push({ query, statement });
      return statement;
    });

    const result = await getSavedWordsSyncMetadata(database, "user-4");

    expect(result).toEqual({
      lastSyncedAt: "2026-04-11T10:05:00Z",
      savedWordCount: 2,
    });
    expect(statements[0]?.statement.bind).toHaveBeenCalledWith("user-4");
  });

  it("replaces the saved-word collection for a user", async () => {
    const { database, statements } = createDatabaseMock();
    const replacementWords = [
      {
        description: "The currency of model usage.",
        href: "/dictionary/tokens",
        savedAt: "2026-04-11T10:15:00.000Z",
        slug: "tokens",
        title: "Tokens",
      },
    ];

    database.prepare.mockImplementation((query: string) => {
      const statement = createPreparedStatementMock();

      if (query.includes("DELETE FROM saved_words")) {
        statement.run.mockResolvedValue(undefined);
      } else if (query.includes("INSERT INTO saved_words")) {
        statement.run.mockResolvedValue(undefined);
      } else if (query.includes("FROM saved_words")) {
        statement.all.mockResolvedValue({ results: replacementWords });
      }

      statements.push({ query, statement });
      return statement;
    });

    const result = await replaceSavedWords(database, "user-5", replacementWords);

    expect(result).toEqual(replacementWords);
    expect(statements.some(({ query }) => query.includes("DELETE FROM saved_words"))).toBe(true);
    expect(statements.some(({ query }) => query.includes("INSERT INTO saved_words"))).toBe(true);
  });
});
