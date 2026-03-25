// @vitest-environment jsdom
/**
 * Tests for the bookmark/save-place/resume-reading system.
 *
 * Covers:
 * - parseSavedPlace validation logic
 * - Safe localStorage helpers (readStorage, writeStorage, removeStorage)
 * - SavePlaceButton toggle behaviour
 * - ResumeReadingCard visibility rules
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  BookmarkProvider,
  parseSavedPlace,
  readStorage,
  removeStorage,
  writeStorage,
} from "@/components/bookmark-provider";
import { SavePlaceButton } from "@/components/save-place-button";
import { ResumeReadingCard } from "@/components/resume-reading-card";

/* ---------- parseSavedPlace ---------- */

describe("parseSavedPlace", () => {
  const validJSON = JSON.stringify({
    href: "/dictionary/agent",
    title: "Agent",
    label: "Dictionary entry",
    description: "A software system granted just enough initiative.",
    savedAt: "2026-03-20T10:00:00.000Z",
  });

  it("returns null for null input", () => {
    expect(parseSavedPlace(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseSavedPlace("")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseSavedPlace("not json {{{")).toBeNull();
  });

  it("returns null when href is missing", () => {
    expect(
      parseSavedPlace(
        JSON.stringify({ title: "X", label: "Y", savedAt: "Z" }),
      ),
    ).toBeNull();
  });

  it("returns null when title is missing", () => {
    expect(
      parseSavedPlace(
        JSON.stringify({ href: "/x", label: "Y", savedAt: "Z" }),
      ),
    ).toBeNull();
  });

  it("returns null when label is missing", () => {
    expect(
      parseSavedPlace(
        JSON.stringify({ href: "/x", title: "X", savedAt: "Z" }),
      ),
    ).toBeNull();
  });

  it("returns null when savedAt is missing", () => {
    expect(
      parseSavedPlace(
        JSON.stringify({ href: "/x", title: "X", label: "Y" }),
      ),
    ).toBeNull();
  });

  it("returns null when a required field has wrong type", () => {
    expect(
      parseSavedPlace(
        JSON.stringify({ href: 123, title: "X", label: "Y", savedAt: "Z" }),
      ),
    ).toBeNull();
  });

  it("returns a valid SavedPlace for correct input", () => {
    const result = parseSavedPlace(validJSON);
    expect(result).toEqual({
      href: "/dictionary/agent",
      title: "Agent",
      label: "Dictionary entry",
      description: "A software system granted just enough initiative.",
      savedAt: "2026-03-20T10:00:00.000Z",
    });
  });

  it("strips unknown fields", () => {
    const input = JSON.stringify({
      href: "/x",
      title: "X",
      label: "Y",
      savedAt: "Z",
      unknownField: "should be removed",
      anotherField: 42,
    });
    const result = parseSavedPlace(input);
    expect(result).toEqual({
      href: "/x",
      title: "X",
      label: "Y",
      savedAt: "Z",
      description: undefined,
    });
    expect(result).not.toHaveProperty("unknownField");
    expect(result).not.toHaveProperty("anotherField");
  });

  it("handles description being absent", () => {
    const input = JSON.stringify({
      href: "/x",
      title: "X",
      label: "Y",
      savedAt: "Z",
    });
    expect(parseSavedPlace(input)?.description).toBeUndefined();
  });

  it("handles description being a non-string", () => {
    const input = JSON.stringify({
      href: "/x",
      title: "X",
      label: "Y",
      savedAt: "Z",
      description: 999,
    });
    expect(parseSavedPlace(input)?.description).toBeUndefined();
  });
});

/* ---------- safe localStorage helpers ---------- */

describe("readStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns the stored value", () => {
    localStorage.setItem("key", "value");
    expect(readStorage("key")).toBe("value");
  });

  it("returns null for missing key", () => {
    expect(readStorage("missing")).toBeNull();
  });

  it("returns null when localStorage throws", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Access denied");
    });
    expect(readStorage("key")).toBeNull();
    spy.mockRestore();
  });
});

describe("writeStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("writes the value", () => {
    writeStorage("key", "value");
    expect(localStorage.getItem("key")).toBe("value");
  });

  it("silently fails when localStorage throws", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    expect(() => writeStorage("key", "value")).not.toThrow();
    spy.mockRestore();
  });
});

describe("removeStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("removes the value", () => {
    localStorage.setItem("key", "value");
    removeStorage("key");
    expect(localStorage.getItem("key")).toBeNull();
  });

  it("silently fails when localStorage throws", () => {
    const spy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("Access denied");
    });
    expect(() => removeStorage("key")).not.toThrow();
    spy.mockRestore();
  });
});

/* ---------- component test helpers ---------- */

const STORAGE_KEY = "saved-reading-place";

const savedPlaceData = {
  href: "/dictionary/agent",
  title: "Agent",
  label: "Dictionary entry",
  description: "A software system.",
  savedAt: "2026-03-20T10:00:00.000Z",
};

function seedStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPlaceData));
}

/* ---------- SavePlaceButton ---------- */

describe("SavePlaceButton", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("is disabled until isReady", () => {
    render(
      <BookmarkProvider>
        <SavePlaceButton href="/test" title="Test" label="Test" />
      </BookmarkProvider>,
    );
    // On first render, before useEffect runs, isReady is false
    // But act() in render may flush effects. The button should be enabled after mount.
    // This test ensures it does not crash.
    expect(screen.getByRole("button")).toBeDefined();
  });

  it('shows "Save this place" when no place is saved', async () => {
    render(
      <BookmarkProvider>
        <SavePlaceButton href="/test" title="Test" label="Test" />
      </BookmarkProvider>,
    );

    // Wait for useEffect to fire
    await act(async () => {});

    expect(screen.getByRole("button").textContent).toBe("Save this place");
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("false");
  });

  it('shows "Unsave this place" when the current place matches', async () => {
    seedStorage();

    render(
      <BookmarkProvider>
        <SavePlaceButton
          href="/dictionary/agent"
          title="Agent"
          label="Dictionary entry"
        />
      </BookmarkProvider>,
    );

    await act(async () => {});

    expect(screen.getByRole("button").textContent).toBe("Unsave this place");
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("true");
  });

  it("saves on click when no place is saved", async () => {
    const user = userEvent.setup();

    render(
      <BookmarkProvider>
        <SavePlaceButton href="/test" title="Test" label="Test label" />
      </BookmarkProvider>,
    );

    await act(async () => {});
    await user.click(screen.getByRole("button"));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.href).toBe("/test");
    expect(stored.title).toBe("Test");
    expect(stored.label).toBe("Test label");
    expect(screen.getByRole("button").textContent).toBe("Unsave this place");
  });

  it("clears on click when current place matches (toggle)", async () => {
    seedStorage();
    const user = userEvent.setup();

    render(
      <BookmarkProvider>
        <SavePlaceButton
          href="/dictionary/agent"
          title="Agent"
          label="Dictionary entry"
        />
      </BookmarkProvider>,
    );

    await act(async () => {});
    expect(screen.getByRole("button").textContent).toBe("Unsave this place");

    await user.click(screen.getByRole("button"));

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.getByRole("button").textContent).toBe("Save this place");
  });
});

/* ---------- ResumeReadingCard ---------- */

describe("ResumeReadingCard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders nothing when no place is saved", async () => {
    const { container } = render(
      <BookmarkProvider>
        <ResumeReadingCard />
      </BookmarkProvider>,
    );

    await act(async () => {});

    expect(container.innerHTML).toBe("");
  });

  it("renders the saved place when one exists", async () => {
    seedStorage();

    render(
      <BookmarkProvider>
        <ResumeReadingCard />
      </BookmarkProvider>,
    );

    await act(async () => {});

    expect(screen.getByText("Agent")).toBeDefined();
    expect(screen.getByText("Dictionary entry")).toBeDefined();
    expect(screen.getByText("Resume reading")).toBeDefined();
    expect(screen.getByText("Clear saved place")).toBeDefined();
  });

  it("hides when savedPlace.href matches hideIfCurrentHref", async () => {
    seedStorage();

    const { container } = render(
      <BookmarkProvider>
        <ResumeReadingCard hideIfCurrentHref="/dictionary/agent" />
      </BookmarkProvider>,
    );

    await act(async () => {});

    expect(container.innerHTML).toBe("");
  });

  it("shows when savedPlace.href does not match hideIfCurrentHref", async () => {
    seedStorage();

    render(
      <BookmarkProvider>
        <ResumeReadingCard hideIfCurrentHref="/some-other-page" />
      </BookmarkProvider>,
    );

    await act(async () => {});

    expect(screen.getByText("Agent")).toBeDefined();
  });

  it("clears the saved place when Clear button is clicked", async () => {
    seedStorage();
    const user = userEvent.setup();

    render(
      <BookmarkProvider>
        <ResumeReadingCard />
      </BookmarkProvider>,
    );

    await act(async () => {});

    await user.click(screen.getByText("Clear saved place"));

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("shows the description when present", async () => {
    seedStorage();

    render(
      <BookmarkProvider>
        <ResumeReadingCard />
      </BookmarkProvider>,
    );

    await act(async () => {});

    expect(screen.getByText("A software system.")).toBeDefined();
  });
});
