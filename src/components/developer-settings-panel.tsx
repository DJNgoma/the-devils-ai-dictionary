"use client";

import { useId, useSyncExternalStore } from "react";

const STORAGE_KEY = "developer-settings-visible";
const CHANGE_EVENT = "developer-settings-visibility-change";

function readStoredVisibility() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeStoredVisibility(visible: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(visible));
  } catch {
    // Keep the in-memory toggle working when storage is unavailable.
  }
}

function subscribeToDeveloperSettingsVisibility(onStoreChange: () => void) {
  function handleStorageChange(event: StorageEvent) {
    if (event.key === STORAGE_KEY) {
      onStoreChange();
    }
  }

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

export function DeveloperSettingsPanel({ children }: { children: React.ReactNode }) {
  const visible = useSyncExternalStore(
    subscribeToDeveloperSettingsVisibility,
    readStoredVisibility,
    () => false,
  );
  const toggleId = useId();

  function setDeveloperSettingsVisible(nextVisible: boolean) {
    writeStoredVisibility(nextVisible);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    <>
      <section className="surface-strong p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="page-kicker">Development</p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground">
              Developer settings
            </h2>
            <p className="mt-3 text-sm leading-7 text-foreground-soft">
              Keep unfinished account and sync controls out of the ordinary settings flow.
            </p>
          </div>

          <label
            htmlFor={toggleId}
            className="inline-flex min-h-[var(--control-height)] max-w-full shrink-0 self-start rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm text-foreground"
          >
            <span className="inline-flex items-center gap-3">
              <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-foreground-soft">
                {visible ? "Shown" : "Hidden"}
              </span>
              <span className="relative inline-flex h-7 w-12 items-center">
                <input
                  id={toggleId}
                  type="checkbox"
                  className="peer sr-only"
                  checked={visible}
                  onChange={(event) => setDeveloperSettingsVisible(event.target.checked)}
                />
                <span className="absolute inset-0 rounded-full border border-line bg-background-muted transition peer-checked:border-accent/60 peer-checked:bg-accent-soft" />
                <span className="absolute left-1 size-5 rounded-full bg-foreground-soft transition peer-checked:translate-x-5 peer-checked:bg-accent" />
              </span>
            </span>
          </label>
        </div>
      </section>

      {visible ? children : null}
    </>
  );
}
