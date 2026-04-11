"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const STORAGE_KEY = "saved-words";
const LEGACY_STORAGE_KEY = "saved-reading-place";
const BOOKMARK_CHANGE_EVENT = "saved-words-change";
const AUTH_SESSION_ENDPOINT = "/api/auth/session";
const AUTH_LOGOUT_ENDPOINT = "/api/auth/logout";
const AUTH_APPLE_START_ENDPOINT = "/api/auth/apple/start";
const SAVED_WORDS_ENDPOINT = "/api/me/saved-words";
const inMemoryStorage = new Map<string, string>();
let cachedRawSavedWords: string | null | undefined;
let cachedParsedSavedWords: SavedWord[] = [];

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
    // Quota exceeded or access denied — state lives in memory only.
  }
}

export function removeStorage(key: string): void {
  inMemoryStorage.delete(key);

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Access denied — state lives in memory only.
  }
}

/* ---------- types ---------- */

export type SavedWord = {
  slug: string;
  href: string;
  title: string;
  description?: string;
  savedAt: string;
};

type SavedWordInput = Omit<SavedWord, "savedAt">;

type SavedWordsSessionUser = {
  displayName: string | null;
  email: string | null;
};

type SavedWordsSession = {
  authenticated: boolean;
  lastSyncedAt: string | null;
  savedWordCount: number | null;
  user: SavedWordsSessionUser | null;
};

type SavedWordsRemoteSnapshot = {
  lastSyncedAt: string | null;
  savedWordCount: number | null;
  savedWords: SavedWord[];
};

type SavedWordsSyncState = {
  authStatus: "loading" | "signed-out" | "signed-in" | "error";
  syncStatus: "idle" | "queued" | "syncing" | "synced" | "error";
  lastSyncedAt: string | null;
  user: SavedWordsSessionUser | null;
  error: string | null;
};

type BookmarkContextValue = {
  isReady: boolean;
  savedWords: SavedWord[];
  savedWordCount: number;
  hasSavedWords: boolean;
  isSavedWord: (slug: string) => boolean;
  getSavedWord: (slug: string) => SavedWord | undefined;
  saveWord: (word: SavedWordInput) => void;
  removeWord: (slug: string) => void;
  clearWords: () => void;
  syncState: SavedWordsSyncState;
  refreshSyncState: () => Promise<void>;
  signIn: () => void;
  signOut: () => Promise<void>;
};

const BookmarkContext = createContext<BookmarkContextValue | null>(null);

function dispatchBookmarkChange() {
  window.dispatchEvent(new Event(BOOKMARK_CHANGE_EVENT));
}

function parseSavedWord(rawWord: unknown): SavedWord | null {
  if (!rawWord || typeof rawWord !== "object") {
    return null;
  }

  const candidate = rawWord as Partial<SavedWord>;

  if (
    typeof candidate.slug !== "string" ||
    typeof candidate.href !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.savedAt !== "string"
  ) {
    return null;
  }

  return {
    slug: candidate.slug,
    href: candidate.href,
    title: candidate.title,
    description:
      typeof candidate.description === "string" ? candidate.description : undefined,
    savedAt: candidate.savedAt,
  };
}

function compareSavedAtDescending(left: SavedWord, right: SavedWord) {
  return Date.parse(right.savedAt) - Date.parse(left.savedAt);
}

function normalizeSavedWords(words: SavedWord[]) {
  const deduped = new Map<string, SavedWord>();

  for (const word of words) {
    const current = deduped.get(word.slug);

    if (!current || compareSavedAtDescending(word, current) < 0) {
      deduped.set(word.slug, word);
    }
  }

  return [...deduped.values()].sort(compareSavedAtDescending);
}

export function parseSavedWords(rawValue: string | null): SavedWord[] {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (Array.isArray(parsed)) {
      return normalizeSavedWords(parsed.map(parseSavedWord).filter(Boolean) as SavedWord[]);
    }

    const legacy = parseSavedWord(parsed);
    return legacy ? [legacy] : [];
  } catch {
    return [];
  }
}

function getRawSavedWordsValue() {
  return readStorage(STORAGE_KEY) ?? readStorage(LEGACY_STORAGE_KEY);
}

function getSavedWordsSnapshot() {
  const rawValue = getRawSavedWordsValue();

  if (rawValue === cachedRawSavedWords) {
    return cachedParsedSavedWords;
  }

  cachedRawSavedWords = rawValue;
  cachedParsedSavedWords = parseSavedWords(rawValue);

  return cachedParsedSavedWords;
}

function subscribeToSavedWords(onStoreChange: () => void) {
  function handleStorageChange(event: StorageEvent) {
    if (event.key !== STORAGE_KEY && event.key !== LEGACY_STORAGE_KEY) {
      return;
    }

    const key = event.key ?? STORAGE_KEY;

    if (event.newValue === null) {
      inMemoryStorage.delete(key);
    } else {
      inMemoryStorage.set(key, event.newValue);
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

function serializeSavedWords(words: SavedWord[]) {
  return JSON.stringify(normalizeSavedWords(words));
}

function fetchSavedWordsFromResponse(payload: unknown): SavedWord[] {
  if (Array.isArray(payload)) {
    return normalizeSavedWords(payload.map(parseSavedWord).filter(Boolean) as SavedWord[]);
  }

  if (payload && typeof payload === "object") {
    const objectPayload = payload as {
      savedWords?: unknown;
      items?: unknown;
      words?: unknown;
      savedWord?: unknown;
    };

    if (Array.isArray(objectPayload.savedWords)) {
      return normalizeSavedWords(
        objectPayload.savedWords.map(parseSavedWord).filter(Boolean) as SavedWord[],
      );
    }

    if (Array.isArray(objectPayload.items)) {
      return normalizeSavedWords(
        objectPayload.items.map(parseSavedWord).filter(Boolean) as SavedWord[],
      );
    }

    if (Array.isArray(objectPayload.words)) {
      return normalizeSavedWords(
        objectPayload.words.map(parseSavedWord).filter(Boolean) as SavedWord[],
      );
    }

    const singleWord = parseSavedWord(objectPayload.savedWord);
    if (singleWord) {
      return [singleWord];
    }
  }

  return [];
}

function normalizeSessionUser(payload: unknown): SavedWordsSessionUser | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as {
    displayName?: unknown;
    email?: unknown;
    name?: unknown;
  };

  if (
    typeof candidate.displayName !== "string" &&
    typeof candidate.name !== "string" &&
    typeof candidate.email !== "string"
  ) {
    return null;
  }

  return {
    displayName:
      typeof candidate.displayName === "string"
        ? candidate.displayName
        : typeof candidate.name === "string"
          ? candidate.name
          : null,
    email: typeof candidate.email === "string" ? candidate.email : null,
  };
}

function parseCount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function parseSessionResponse(payload: unknown): SavedWordsSession {
  if (!payload || typeof payload !== "object") {
    return {
      authenticated: false,
      lastSyncedAt: null,
      savedWordCount: null,
      user: null,
    };
  }

  const candidate = payload as {
    authenticated?: unknown;
    lastSyncedAt?: unknown;
    savedWordCount?: unknown;
    user?: unknown;
    account?: unknown;
    session?: unknown;
  };

  const nestedSession = candidate.session && typeof candidate.session === "object"
    ? (candidate.session as {
        authenticated?: unknown;
        lastSyncedAt?: unknown;
        savedWordCount?: unknown;
        user?: unknown;
      })
    : null;
  const nestedAccount = candidate.account && typeof candidate.account === "object"
    ? (candidate.account as {
        authenticated?: unknown;
        lastSyncedAt?: unknown;
        savedWordCount?: unknown;
        user?: unknown;
      })
    : null;

  const explicitAuthenticated =
    candidate.authenticated ??
    nestedSession?.authenticated ??
    nestedAccount?.authenticated;
  const authenticated =
    typeof explicitAuthenticated === "boolean"
      ? explicitAuthenticated
      : Boolean(candidate.user ?? nestedSession?.user ?? nestedAccount?.user);
  const user =
    normalizeSessionUser(candidate.user) ??
    normalizeSessionUser(nestedSession?.user) ??
    normalizeSessionUser(nestedAccount?.user);
  const lastSyncedAt =
    typeof candidate.lastSyncedAt === "string"
      ? candidate.lastSyncedAt
      : typeof nestedSession?.lastSyncedAt === "string"
        ? nestedSession.lastSyncedAt
        : typeof nestedAccount?.lastSyncedAt === "string"
          ? nestedAccount.lastSyncedAt
          : null;
  const savedWordCount =
    parseCount(candidate.savedWordCount) ??
    parseCount(nestedSession?.savedWordCount) ??
    parseCount(nestedAccount?.savedWordCount);

  return { authenticated, lastSyncedAt, savedWordCount, user };
}

async function fetchSession() {
  const response = await fetch(AUTH_SESSION_ENDPOINT, {
    credentials: "include",
    headers: { accept: "application/json" },
  });

  if (response.status === 401) {
    return {
      authenticated: false,
      lastSyncedAt: null,
      savedWordCount: null,
      user: null,
    };
  }

  if (!response.ok) {
    throw new Error("The site could not load your account state.");
  }

  return parseSessionResponse(await response.json());
}

function parseSavedWordsResponse(payload: unknown): SavedWordsRemoteSnapshot {
  const savedWords = fetchSavedWordsFromResponse(payload);

  if (!payload || typeof payload !== "object") {
    return {
      lastSyncedAt: null,
      savedWordCount: savedWords.length,
      savedWords,
    };
  }

  const candidate = payload as {
    lastSyncedAt?: unknown;
    savedWordCount?: unknown;
    savedWordsCount?: unknown;
    wordsCount?: unknown;
  };

  return {
    lastSyncedAt:
      typeof candidate.lastSyncedAt === "string" ? candidate.lastSyncedAt : null,
    savedWordCount:
      parseCount(candidate.savedWordCount) ??
      parseCount(candidate.savedWordsCount) ??
      parseCount(candidate.wordsCount) ??
      savedWords.length,
    savedWords,
  };
}

async function fetchRemoteSavedWords(): Promise<SavedWordsRemoteSnapshot> {
  const response = await fetch(SAVED_WORDS_ENDPOINT, {
    credentials: "include",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("The site could not load saved words from your account.");
  }

  return parseSavedWordsResponse(await response.json());
}

async function replaceRemoteSavedWords(
  savedWords: SavedWord[],
): Promise<SavedWordsRemoteSnapshot> {
  const response = await fetch(SAVED_WORDS_ENDPOINT, {
    credentials: "include",
    method: "PUT",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      replace: true,
      words: savedWords,
    }),
  });

  if (!response.ok) {
    throw new Error("The site could not sync saved words to your account.");
  }

  return parseSavedWordsResponse(await response.json());
}

async function logoutFromAccount() {
  const response = await fetch(AUTH_LOGOUT_ENDPOINT, {
    credentials: "include",
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("The site could not sign you out.");
  }
}

function saveWordsToStorage(words: SavedWord[]) {
  const serialized = serializeSavedWords(words);
  writeStorage(STORAGE_KEY, serialized);
  removeStorage(LEGACY_STORAGE_KEY);
  dispatchBookmarkChange();
}

function buildReturnTo() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function savedWordsMatch(left: SavedWord[], right: SavedWord[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((word, index) => {
    const candidate = right[index];

    return (
      candidate &&
      candidate.slug === word.slug &&
      candidate.href === word.href &&
      candidate.title === word.title &&
      candidate.description === word.description &&
      candidate.savedAt === word.savedAt
    );
  });
}

function getSavedWordsStatusMessage(syncState: SavedWordsSyncState, count: number) {
  if (syncState.authStatus === "loading") {
    return "Checking whether this browser has an account to sync with.";
  }

  if (syncState.authStatus === "error") {
    return syncState.error ?? "The account state could not be checked.";
  }

  if (syncState.authStatus === "signed-out") {
    return count === 0
      ? "Saved words stay on this device until you sign in."
      : "Saved words stay on this device for now. Sign in if you want them to follow you around.";
  }

  if (syncState.syncStatus === "syncing") {
    return "Syncing your saved words. The cloud is learning a new habit.";
  }

  if (syncState.syncStatus === "queued") {
    return "Recent changes are queued. The cloud can wait a beat before filing them.";
  }

  if (syncState.syncStatus === "error") {
    return syncState.error ?? "Saved words could not be synced just now.";
  }

  return "Saved words are synced to your account.";
}

export function SavedWordsProvider({ children }: { children: React.ReactNode }) {
  const isReady = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const savedWords = useSyncExternalStore(subscribeToSavedWords, getSavedWordsSnapshot, () => []);
  const savedWordsRef = useRef(savedWords);
  const [syncState, setSyncState] = useState<SavedWordsSyncState>({
    authStatus: "loading",
    syncStatus: "idle",
    lastSyncedAt: null,
    user: null,
    error: null,
  });
  const syncStateRef = useRef(syncState);
  const pendingSyncTimerRef = useRef<number | null>(null);
  const hasPendingLocalChangesRef = useRef(false);

  savedWordsRef.current = savedWords;
  syncStateRef.current = syncState;

  const clearPendingSyncTimer = useCallback(() => {
    if (pendingSyncTimerRef.current !== null) {
      window.clearTimeout(pendingSyncTimerRef.current);
      pendingSyncTimerRef.current = null;
    }
  }, []);

  const flushSavedWordsNow = useCallback(async (user: SavedWordsSessionUser | null) => {
    clearPendingSyncTimer();

    setSyncState((current) => ({
      ...current,
      authStatus: "signed-in",
      error: null,
      syncStatus: "syncing",
      user,
    }));

    try {
      const snapshot = await replaceRemoteSavedWords(savedWordsRef.current);
      const normalizedWords = normalizeSavedWords(
        snapshot.savedWords.length > 0 || savedWordsRef.current.length === 0
          ? snapshot.savedWords
          : savedWordsRef.current,
      );

      saveWordsToStorage(normalizedWords);
      hasPendingLocalChangesRef.current = false;

      setSyncState((current) => ({
        ...current,
        authStatus: "signed-in",
        error: null,
        lastSyncedAt: snapshot.lastSyncedAt ?? new Date().toISOString(),
        syncStatus: "synced",
        user,
      }));

      return true;
    } catch (error) {
      setSyncState((current) => ({
        ...current,
        authStatus: "signed-in",
        error:
          error instanceof Error ? error.message : "Saved words could not be synced.",
        syncStatus: "error",
        user,
      }));

      return false;
    }
  }, [clearPendingSyncTimer]);

  const queueSavedWordsSync = useCallback(() => {
    if (syncStateRef.current.authStatus !== "signed-in") {
      return;
    }

    clearPendingSyncTimer();
    hasPendingLocalChangesRef.current = true;

    setSyncState((current) => ({
      ...current,
      error: null,
      syncStatus: "queued",
    }));

    pendingSyncTimerRef.current = window.setTimeout(() => {
      pendingSyncTimerRef.current = null;
      void flushSavedWordsNow(syncStateRef.current.user);
    }, 1500);
  }, [clearPendingSyncTimer, flushSavedWordsNow]);

  const refreshSyncState = useCallback(async () => {
    setSyncState((current) => ({
      ...current,
      authStatus: "loading",
      error: null,
      syncStatus: current.authStatus === "signed-in" ? "syncing" : "idle",
    }));

    try {
      const session = await fetchSession();

      if (!session.authenticated) {
        clearPendingSyncTimer();
        hasPendingLocalChangesRef.current = false;
        setSyncState({
          authStatus: "signed-out",
          syncStatus: "idle",
          lastSyncedAt: null,
          user: null,
          error: null,
        });
        return;
      }

      if (hasPendingLocalChangesRef.current) {
        await flushSavedWordsNow(session.user);
        return;
      }

      const remoteSnapshot = await fetchRemoteSavedWords();
      const mergedWords = normalizeSavedWords([
        ...savedWordsRef.current,
        ...remoteSnapshot.savedWords,
      ]);
      let lastSyncedAt = remoteSnapshot.lastSyncedAt ?? session.lastSyncedAt;

      saveWordsToStorage(mergedWords);

      if (!savedWordsMatch(mergedWords, remoteSnapshot.savedWords)) {
        const syncedSnapshot = await replaceRemoteSavedWords(mergedWords);
        const syncedWords = normalizeSavedWords(
          syncedSnapshot.savedWords.length > 0 || mergedWords.length === 0
            ? syncedSnapshot.savedWords
            : mergedWords,
        );
        saveWordsToStorage(syncedWords);
        lastSyncedAt = syncedSnapshot.lastSyncedAt ?? new Date().toISOString();
      }

      setSyncState({
        authStatus: "signed-in",
        lastSyncedAt,
        syncStatus: "synced",
        user: session.user,
        error: null,
      });
    } catch (error) {
      setSyncState((current) => ({
        ...current,
        authStatus: current.authStatus === "signed-in" ? "signed-in" : "error",
        syncStatus: "error",
        error: error instanceof Error ? error.message : "The account state could not be refreshed.",
      }));
    }
  }, [clearPendingSyncTimer, flushSavedWordsNow]);

  useEffect(() => {
    void refreshSyncState();
  }, [refreshSyncState]);

  useEffect(() => {
    return () => {
      clearPendingSyncTimer();
    };
  }, [clearPendingSyncTimer]);

  const saveWord = useCallback((word: SavedWordInput) => {
    const nextWord: SavedWord = {
      ...word,
      savedAt: new Date().toISOString(),
    };
    const nextWords = normalizeSavedWords([
      nextWord,
      ...savedWordsRef.current.filter((existing) => existing.slug !== nextWord.slug),
    ]);

    saveWordsToStorage(nextWords);
    queueSavedWordsSync();
  }, [queueSavedWordsSync]);

  const removeWord = useCallback((slug: string) => {
    const removedWord = savedWordsRef.current.find((word) => word.slug === slug);
    if (!removedWord) {
      return;
    }

    saveWordsToStorage(savedWordsRef.current.filter((word) => word.slug !== slug));
    queueSavedWordsSync();
  }, [queueSavedWordsSync]);

  const clearWords = useCallback(() => {
    saveWordsToStorage([]);
    queueSavedWordsSync();
  }, [queueSavedWordsSync]);

  const isSavedWord = useCallback(
    (slug: string) => savedWords.some((word) => word.slug === slug),
    [savedWords],
  );

  const getSavedWord = useCallback(
    (slug: string) => savedWords.find((word) => word.slug === slug),
    [savedWords],
  );

  const signIn = useCallback(() => {
    const returnTo = encodeURIComponent(buildReturnTo());
    window.location.assign(`${AUTH_APPLE_START_ENDPOINT}?returnTo=${returnTo}`);
  }, []);

  const signOut = useCallback(async () => {
    clearPendingSyncTimer();
    hasPendingLocalChangesRef.current = false;
    await logoutFromAccount();
    await refreshSyncState();
  }, [clearPendingSyncTimer, refreshSyncState]);

  const value = useMemo(
    () => ({
      isReady,
      savedWords,
      savedWordCount: savedWords.length,
      hasSavedWords: savedWords.length > 0,
      isSavedWord,
      getSavedWord,
      saveWord,
      removeWord,
      clearWords,
      syncState,
      refreshSyncState,
      signIn,
      signOut,
    }),
    [
      clearWords,
      getSavedWord,
      isReady,
      isSavedWord,
      refreshSyncState,
      removeWord,
      saveWord,
      savedWords,
      signIn,
      signOut,
      syncState,
    ],
  );

  return (
    <BookmarkContext.Provider value={value}>{children}</BookmarkContext.Provider>
  );
}

export const BookmarkProvider = SavedWordsProvider;

export function useSavedWords() {
  const context = useContext(BookmarkContext);

  if (!context) {
    throw new Error("useSavedWords must be used inside SavedWordsProvider.");
  }

  return context;
}

export const useBookmark = useSavedWords;

export { getSavedWordsStatusMessage };
