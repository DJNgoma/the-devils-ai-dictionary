"use client";

import { useState } from "react";
import {
  getSavedWordsStatusMessage,
  useSavedWords,
} from "@/components/bookmark-provider";

function formatSyncMoment(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function SavedWordsSyncPanel() {
  const { savedWordCount, syncState, signIn, signOut, refreshSyncState } = useSavedWords();
  const [busy, setBusy] = useState(false);
  const isSignedIn = syncState.authStatus === "signed-in";
  const lastSyncedLabel = formatSyncMoment(syncState.lastSyncedAt);

  return (
    <div className="surface p-6 sm:p-8">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        Saved words sync
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground-soft">
        {getSavedWordsStatusMessage(syncState, savedWordCount)}
      </p>

      <div className="mt-5 grid gap-4">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-soft">
            Account
          </p>
          <p className="mt-2 text-sm leading-7 text-foreground">
            {syncState.authStatus === "loading"
              ? "Checking account state."
              : isSignedIn
                ? "Signed in with Apple."
                : "Not signed in. Saved words stay on this device only."}
          </p>
        </div>

        <div className="rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-soft">
            Sync
          </p>
          <p className="mt-2 text-sm leading-7 text-foreground">
            {syncState.syncStatus === "error"
              ? syncState.error ?? "Saved words could not be synced just now."
              : syncState.syncStatus === "queued"
                ? "Recent changes are queued. The clerk will send them shortly."
              : syncState.syncStatus === "syncing"
                ? "Syncing saved words now."
                : isSignedIn
                  ? "Saved words are in step with your account."
                  : "Local only until you sign in."}
          </p>
          {lastSyncedLabel ? (
            <p className="mt-2 text-xs leading-6 text-foreground-soft">
              Last synced {lastSyncedLabel}.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {isSignedIn ? (
          <button
            type="button"
            className="button button-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await signOut();
              } finally {
                setBusy(false);
              }
            }}
          >
            Sign out
          </button>
        ) : (
          <button
            type="button"
            className="button button-primary"
            disabled={busy}
            onClick={() => signIn()}
          >
            Sign in with Apple
          </button>
        )}
        <button
          type="button"
          className="button button-secondary"
          disabled={busy || syncState.syncStatus === "syncing"}
          onClick={async () => {
            setBusy(true);
            try {
              await refreshSyncState();
            } finally {
              setBusy(false);
            }
          }}
        >
          {syncState.syncStatus === "syncing"
            ? "Syncing…"
            : isSignedIn
              ? "Sync now"
              : "Refresh status"}
        </button>
      </div>
    </div>
  );
}
