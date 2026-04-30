// @vitest-environment jsdom
/**
 * Tests for the saved-word collection and sync surfaces.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  BookmarkProvider,
  parseSavedWords,
  readStorage,
  removeStorage,
  writeStorage,
} from "@/components/bookmark-provider";
import { TodayWordCard } from "@/components/featured-entry";
import { ResumeReadingCard } from "@/components/resume-reading-card";
import { SaveWordButton } from "@/components/save-place-button";
import { SavedPagePanel } from "@/components/saved-page-panel";
import { SavedWordsSyncPanel } from "@/components/saved-words-sync-panel";

const STORAGE_KEY = "saved-words";

type FetchConfig = {
  sessionStatus: number;
  sessionBody: unknown;
  savedWordsStatus: number;
  savedWordsBody: unknown;
  logoutStatus: number;
  putStatus: number;
  deleteStatus: number;
};

const defaultFetchConfig: FetchConfig = {
  sessionStatus: 401,
  sessionBody: { authenticated: false },
  savedWordsStatus: 200,
  savedWordsBody: { savedWords: [] },
  logoutStatus: 204,
  putStatus: 200,
  deleteStatus: 204,
};

let fetchConfig = { ...defaultFetchConfig };
const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input.toString();
  const method = init?.method ?? (input instanceof Request ? input.method : "GET");

  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

  if (url.endsWith("/api/auth/session")) {
    return jsonResponse(fetchConfig.sessionBody, fetchConfig.sessionStatus);
  }

  if (url.endsWith("/api/me/saved-words")) {
    if (method === "GET") {
      return jsonResponse(fetchConfig.savedWordsBody, fetchConfig.savedWordsStatus);
    }

    if (method === "PUT") {
      return jsonResponse(fetchConfig.savedWordsBody, fetchConfig.putStatus);
    }

    if (method === "DELETE") {
      return new Response(null, { status: fetchConfig.deleteStatus });
    }
  }

  if (url.endsWith("/api/auth/logout")) {
    return new Response(null, { status: fetchConfig.logoutStatus });
  }

  return new Response(null, { status: 404 });
});

function seedStorage(savedWords: unknown) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedWords));
}

function renderWithProvider(ui: React.ReactElement) {
  return render(<BookmarkProvider>{ui}</BookmarkProvider>);
}

beforeEach(() => {
    fetchConfig = { ...defaultFetchConfig };
    fetchMock.mockReset();
    localStorage.clear();
    vi.useRealTimers();
    vi.stubGlobal("fetch", fetchMock);
  });

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("parseSavedWords", () => {
  it("returns an empty array for missing or invalid data", () => {
    expect(parseSavedWords(null)).toEqual([]);
    expect(parseSavedWords("")).toEqual([]);
    expect(parseSavedWords("not json")).toEqual([]);
    expect(parseSavedWords(JSON.stringify({ title: "Agent" }))).toEqual([]);
  });

  it("normalizes and sorts a saved-word collection", () => {
    const result = parseSavedWords(
      JSON.stringify([
        {
          slug: "tokens",
          href: "/dictionary/tokens",
          title: "Tokens",
          description: "The currency of model usage.",
          savedAt: "2026-03-20T10:00:00.000Z",
        },
        {
          slug: "agent",
          href: "/dictionary/agent",
          title: "Agent",
          savedAt: "2026-03-21T10:00:00.000Z",
        },
      ]),
    );

    expect(result.map((word) => word.slug)).toEqual(["agent", "tokens"]);
  });

  it("accepts the legacy single saved-place object", () => {
    const result = parseSavedWords(
      JSON.stringify({
        slug: "agent",
        href: "/dictionary/agent",
        title: "Agent",
        description: "A software system.",
        savedAt: "2026-03-20T10:00:00.000Z",
      }),
    );

    expect(result).toEqual([
      {
        slug: "agent",
        href: "/dictionary/agent",
        title: "Agent",
        description: "A software system.",
        savedAt: "2026-03-20T10:00:00.000Z",
      },
    ]);
  });
});

describe("safe localStorage helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reads, writes, and removes values", () => {
    writeStorage("key", "value");
    expect(readStorage("key")).toBe("value");
    removeStorage("key");
    expect(readStorage("key")).toBeNull();
  });
});

describe("SaveWordButton", () => {
  it("saves and removes a word from the collection", async () => {
    const user = userEvent.setup();

    renderWithProvider(
      <SaveWordButton
        slug="agent"
        href="/dictionary/agent"
        title="Agent"
        description="A software system."
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button").textContent).toBe("Save this word");
    });

    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByRole("button").textContent).toBe("Remove from saved words");
    });

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")).toEqual([
      expect.objectContaining({ slug: "agent", href: "/dictionary/agent" }),
    ]);

    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByRole("button").textContent).toBe("Save this word");
    });

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")).toEqual([]);
  });
});

describe("TodayWordCard", () => {
  it("offers the saved-word control on the daily feature card", async () => {
    const user = userEvent.setup();
    const entry = {
      slug: "agent",
      title: "Agent",
      devilDefinition: "A software system.",
      plainDefinition: "A system that pursues a goal across steps.",
      letter: "A",
      categories: ["Agents and workflows"],
      isVendorTerm: false,
    };

    renderWithProvider(
      <TodayWordCard entry={entry as never} />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Save this word" }),
      ).toBeDefined();
    });

    await user.click(screen.getByRole("button", { name: "Save this word" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Remove from saved words" }),
      ).toBeDefined();
    });
  });
});

describe("ResumeReadingCard", () => {
  it("renders a preview list for saved words", async () => {
    seedStorage([
      {
        slug: "agent",
        href: "/dictionary/agent",
        title: "Agent",
        description: "A software system.",
        savedAt: "2026-03-21T10:00:00.000Z",
      },
      {
        slug: "tokens",
        href: "/dictionary/tokens",
        title: "Tokens",
        description: "The currency of model usage.",
        savedAt: "2026-03-20T10:00:00.000Z",
      },
    ]);

    renderWithProvider(<ResumeReadingCard hideIfCurrentHref="/dictionary/agent" />);

    await waitFor(() => {
      expect(screen.getByText("Saved words")).toBeDefined();
    });

    expect(screen.queryByText("Agent")).toBeNull();
    expect(screen.getByText("Tokens")).toBeDefined();
    expect(screen.getByRole("link", { name: "Open saved words" })).toBeDefined();
  });
});

describe("SavedPagePanel", () => {
  it("renders the empty state when nothing is saved", async () => {
    renderWithProvider(<SavedPagePanel />);

    await waitFor(() => {
      expect(screen.getByText("Save words while you read.")).toBeDefined();
    });
  });

  it("renders and removes saved words", async () => {
    const user = userEvent.setup();

    seedStorage([
      {
        slug: "agent",
        href: "/dictionary/agent",
        title: "Agent",
        description: "A software system.",
        savedAt: "2026-03-21T10:00:00.000Z",
      },
      {
        slug: "tokens",
        href: "/dictionary/tokens",
        title: "Tokens",
        description: "The currency of model usage.",
        savedAt: "2026-03-20T10:00:00.000Z",
      },
    ]);

    renderWithProvider(<SavedPagePanel />);

    await waitFor(() => {
      expect(screen.getByText("2 saved words")).toBeDefined();
    });

    await user.click(screen.getAllByRole("button", { name: "Remove" })[0]);

    await waitFor(() => {
      expect(screen.queryByText("Agent")).toBeNull();
    });

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")).toEqual([
      expect.objectContaining({ slug: "tokens" }),
    ]);
  });
});

describe("SavedWordsSyncPanel", () => {
  it("shows signed-out state when no session exists", async () => {
    renderWithProvider(<SavedWordsSyncPanel />);

    await waitFor(() => {
      expect(
        screen.getByText("Saved words stay on this device until you sign in."),
      ).toBeDefined();
    });

    expect(screen.getByRole("button", { name: "Sign in with Apple" })).toBeDefined();
  });

  it("shows account and sync state when signed in", async () => {
    fetchConfig = {
      ...defaultFetchConfig,
      sessionStatus: 200,
      sessionBody: {
        authenticated: true,
        lastSyncedAt: "2026-03-21T10:05:00.000Z",
        user: { name: "Ada", email: "ada@example.test" },
      },
      savedWordsBody: {
        lastSyncedAt: "2026-03-21T10:05:00.000Z",
        savedWords: [
          {
            slug: "agent",
            href: "/dictionary/agent",
            title: "Agent",
            savedAt: "2026-03-21T10:00:00.000Z",
          },
        ],
      },
    };

    renderWithProvider(<SavedWordsSyncPanel />);

    await waitFor(() => {
      expect(screen.getByText("Signed in with Apple.")).toBeDefined();
    });

    expect(screen.getByText("Saved words are in step with your account.")).toBeDefined();
    expect(screen.getByText(/Last synced/i)).toBeDefined();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeDefined();
  });

  it("debounces signed-in saved-word changes before syncing", async () => {
    fetchConfig = {
      ...defaultFetchConfig,
      sessionStatus: 200,
      sessionBody: {
        authenticated: true,
        lastSyncedAt: "2026-03-21T10:05:00.000Z",
        user: { name: "Ada", email: "ada@example.test" },
      },
      savedWordsBody: {
        lastSyncedAt: "2026-03-21T10:05:00.000Z",
        savedWords: [],
      },
    };

    renderWithProvider(
      <SaveWordButton
        slug="agent"
        href="/dictionary/agent"
        title="Agent"
        description="A software system."
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save this word" })).toBeDefined();
    });

    vi.useFakeTimers();
    screen.getByRole("button", { name: "Save this word" }).click();

    expect(
      fetchMock.mock.calls.filter(([, init]) => (init?.method ?? "GET") === "PUT"),
    ).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1600);
    await Promise.resolve();

    expect(
      fetchMock.mock.calls.filter(([, init]) => (init?.method ?? "GET") === "PUT"),
    ).toHaveLength(1);
  });
});
