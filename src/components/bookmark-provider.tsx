"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "saved-reading-place";

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

function parseSavedPlace(rawValue: string | null): SavedPlace | null {
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
  const [savedPlace, setSavedPlace] = useState<SavedPlace | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setSavedPlace(parseSavedPlace(window.localStorage.getItem(STORAGE_KEY)));
    setIsReady(true);
  }, []);

  const savePlace = useCallback((place: SavePlaceInput) => {
    const nextPlace: SavedPlace = {
      ...place,
      savedAt: new Date().toISOString(),
    };

    setSavedPlace(nextPlace);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPlace));
  }, []);

  const clearPlace = useCallback(() => {
    setSavedPlace(null);
    window.localStorage.removeItem(STORAGE_KEY);
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
