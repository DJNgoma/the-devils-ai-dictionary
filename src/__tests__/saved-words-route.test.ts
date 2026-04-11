import { beforeEach, describe, expect, it, vi } from "vitest";

const cloudflareMocks = vi.hoisted(() => ({
  getAppServerEnv: vi.fn(),
  requirePrimaryDatabase: vi.fn(),
}));
const authMocks = vi.hoisted(() => ({
  getAuthenticatedSession: vi.fn(),
  readSessionToken: vi.fn(),
}));
const savedWordMocks = vi.hoisted(() => ({
  deleteSavedWord: vi.fn(),
  getSavedWordsSyncMetadata: vi.fn(),
  listSavedWords: vi.fn(),
  replaceSavedWords: vi.fn(),
  upsertSavedWord: vi.fn(),
  upsertSavedWords: vi.fn(),
}));

vi.mock("@/lib/server/cloudflare-context", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/server/cloudflare-context")
  >("@/lib/server/cloudflare-context");

  return {
    ...actual,
    getAppServerEnv: cloudflareMocks.getAppServerEnv,
    requirePrimaryDatabase: cloudflareMocks.requirePrimaryDatabase,
  };
});

vi.mock("@/lib/server/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/auth")>(
    "@/lib/server/auth",
  );

  return {
    ...actual,
    getAuthenticatedSession: authMocks.getAuthenticatedSession,
    readSessionToken: authMocks.readSessionToken,
  };
});

vi.mock("@/lib/server/saved-words", () => ({
  deleteSavedWord: savedWordMocks.deleteSavedWord,
  getSavedWordsSyncMetadata: savedWordMocks.getSavedWordsSyncMetadata,
  listSavedWords: savedWordMocks.listSavedWords,
  replaceSavedWords: savedWordMocks.replaceSavedWords,
  upsertSavedWord: savedWordMocks.upsertSavedWord,
  upsertSavedWords: savedWordMocks.upsertSavedWords,
}));

import { DELETE, GET, PUT } from "@/app/api/me/saved-words/route";

describe("GET/PUT/DELETE /api/me/saved-words", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    cloudflareMocks.getAppServerEnv.mockResolvedValue({
      PUSH_INSTALLATIONS_DB: { prepare: vi.fn() },
    });
    cloudflareMocks.requirePrimaryDatabase.mockReturnValue({
      prepare: vi.fn(),
    });
    authMocks.readSessionToken.mockReturnValue("session-token");
    authMocks.getAuthenticatedSession.mockResolvedValue({
      expiresAt: "2026-05-11T10:00:00.000Z",
      platform: "web",
      sessionId: "session-1",
      user: {
        displayName: "Reader",
        email: "reader@example.com",
        emailVerified: true,
        id: "user-1",
        isPrivateEmail: false,
      },
      userId: "user-1",
    });
    savedWordMocks.getSavedWordsSyncMetadata.mockResolvedValue({
      lastSyncedAt: "2026-04-11T10:05:00.000Z",
      savedWordCount: 1,
    });
  });

  it("lists saved words for the signed-in user", async () => {
    savedWordMocks.listSavedWords.mockResolvedValue([
      {
        description: "A software system granted just enough initiative.",
        href: "/dictionary/agent",
        savedAt: "2026-04-11T10:00:00.000Z",
        slug: "agent",
        title: "Agent",
      },
    ]);

    const response = await GET(
      new Request("https://example.com/api/me/saved-words"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      lastSyncedAt: "2026-04-11T10:05:00.000Z",
      ok: true,
      savedWordCount: 1,
      savedWords: [
        {
          slug: "agent",
        },
      ],
    });
    expect(savedWordMocks.listSavedWords).toHaveBeenCalledWith(
      expect.any(Object),
      "user-1",
    );
  });

  it("saves a word for the signed-in user", async () => {
    savedWordMocks.upsertSavedWord.mockResolvedValue({
      description: "A software system granted just enough initiative.",
      href: "/dictionary/agent",
      savedAt: "2026-04-11T10:00:00.000Z",
      slug: "agent",
      title: "Agent",
    });

    const response = await PUT(
      new Request("https://example.com/api/me/saved-words", {
        body: JSON.stringify({
          description: "A software system granted just enough initiative.",
          href: "/dictionary/agent",
          savedAt: "2026-04-11T10:00:00.000Z",
          slug: "agent",
          title: "Agent",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PUT",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      lastSyncedAt: "2026-04-11T10:05:00.000Z",
      ok: true,
      savedWordCount: 1,
      savedWord: {
        slug: "agent",
      },
    });
    expect(savedWordMocks.upsertSavedWord).toHaveBeenCalledWith(
      expect.any(Object),
      "user-1",
      expect.objectContaining({
        slug: "agent",
      }),
    );
  });

  it("deletes a saved word by slug", async () => {
    savedWordMocks.deleteSavedWord.mockResolvedValue(undefined);
    savedWordMocks.listSavedWords.mockResolvedValue([]);
    savedWordMocks.getSavedWordsSyncMetadata.mockResolvedValue({
      lastSyncedAt: null,
      savedWordCount: 0,
    });

    const response = await DELETE(
      new Request("https://example.com/api/me/saved-words?slug=agent", {
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      lastSyncedAt: null,
      ok: true,
      savedWordCount: 0,
      savedWords: [],
      words: [],
    });
    expect(savedWordMocks.deleteSavedWord).toHaveBeenCalledWith(
      expect.any(Object),
      "user-1",
      "agent",
    );
  });

  it("replaces the whole saved-word collection when requested", async () => {
    savedWordMocks.replaceSavedWords.mockResolvedValue([
      {
        description: "The currency of model usage.",
        href: "/dictionary/tokens",
        savedAt: "2026-04-11T10:15:00.000Z",
        slug: "tokens",
        title: "Tokens",
      },
    ]);
    savedWordMocks.getSavedWordsSyncMetadata.mockResolvedValue({
      lastSyncedAt: "2026-04-11T10:15:00.000Z",
      savedWordCount: 1,
    });

    const response = await PUT(
      new Request("https://example.com/api/me/saved-words", {
        body: JSON.stringify({
          replace: true,
          words: [
            {
              description: "The currency of model usage.",
              href: "/dictionary/tokens",
              savedAt: "2026-04-11T10:15:00.000Z",
              slug: "tokens",
              title: "Tokens",
            },
          ],
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PUT",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      lastSyncedAt: "2026-04-11T10:15:00.000Z",
      ok: true,
      savedWordCount: 1,
      savedWords: [
        {
          slug: "tokens",
        },
      ],
    });
    expect(savedWordMocks.replaceSavedWords).toHaveBeenCalledWith(
      expect.any(Object),
      "user-1",
      [
        expect.objectContaining({
          slug: "tokens",
        }),
      ],
    );
  });
});
