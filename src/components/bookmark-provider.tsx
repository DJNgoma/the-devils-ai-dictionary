"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

const STORAGE_KEY = "saved-reading-place";
const BOOKMARK_CHANGE_EVENT = "saved-reading-place-change";
const inMemoryStorage = new Map<string, string>();
let cachedRawSavedPlace: string | null | undefined;
let cachedParsedSavedPlace: SavedPlace | null = null;

/* ---------- safe localStorage helpers ---------- */

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return inMemoryStorage.get(key) ?? null;
  }
}

export function writeStorage(key: string, value: string): void {
  inMemoryStorage.set(key, value);

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Quota exceeded or access denied — state lives in memory only
  }
}

export function removeStorage(key: string): void {
  inMemoryStorage.delete(key);

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Access denied — state lives in memory only
  }
}

/* ---------- types ---------- */

export type SavedPlace = {
  href: string;
  title: string;
  label: string;
  description?: string;
  savedAt: string;
};

type SavePlaceInput = Omit<SavedPlace, "savedAt">;

type BookmarkContextValue = {
  isReady: boolean;
  savedPlace: SavedPlace | null;
  savePlace: (place: SavePlaceInput) => void;
  clearPlace: () => void;
};

const BookmarkContext = createContext<BookmarkContextValue | null>(null);

function dispatchBookmarkChange() {
  window.dispatchEvent(new Event(BOOKMARK_CHANGE_EVENT));
}

function getSavedPlaceSnapshot() {
  const rawValue = readStorage(STORAGE_KEY);

  if (rawValue === cachedRawSavedPlace) {
    return cachedParsedSavedPlace;
  }

  cachedRawSavedPlace = rawValue;
  cachedParsedSavedPlace = parseSavedPlace(rawValue);

  return cachedParsedSavedPlace;
}

function subscribeToSavedPlace(onStoreChange: () => void) {
  function handleStorageChange(event: StorageEvent) {
    if (event.key !== STORAGE_KEY) {
      return;
    }

    if (event.newValue === null) {
      inMemoryStorage.delete(STORAGE_KEY);
    } else {
      inMemoryStorage.set(STORAGE_KEY, event.newValue);
    }

    onStoreChange();
  }

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(BOOKMARK_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(BOOKMARK_CHANGE_EVENT, onStoreChange);
  };
}

function subscribeToHydration() {
  return () => {};
}

export function parseSavedPlace(rawValue: string | null): SavedPlace | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<SavedPlace>;

    if (
      typeof parsed.href !== "string" ||
      typeof parsed.title !== "string" ||
      typeof parsed.label !== "string" ||
      typeof parsed.savedAt !== "string"
    ) {
      return null;
    }

    return {
      href: parsed.href,
      title: parsed.title,
      label: parsed.label,
      description:
        typeof parsed.description === "string" ? parsed.description : undefined,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const isReady = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const savedPlace = useSyncExternalStore(
    subscribeToSavedPlace,
    getSavedPlaceSnapshot,
    () => null,
  );

  const savePlace = useCallback((place: SavePlaceInput) => {
    const nextPlace: SavedPlace = {
      ...place,
      savedAt: new Date().toISOString(),
    };

    writeStorage(STORAGE_KEY, JSON.stringify(nextPlace));
    dispatchBookmarkChange();
  }, []);

  const clearPlace = useCallback(() => {
    removeStorage(STORAGE_KEY);
    dispatchBookmarkChange();
  }, []);

  const value = useMemo(
    () => ({
      isReady,
      savedPlace,
      savePlace,
      clearPlace,
    }),
    [clearPlace, isReady, savePlace, savedPlace],
  );

  return (
    <BookmarkContext.Provider value={value}>{children}</BookmarkContext.Provider>
  );
}

export function useBookmark() {
  const context = useContext(BookmarkContext);

  if (!context) {
    throw new Error("useBookmark must be used inside BookmarkProvider.");
  }

  return context;
}
