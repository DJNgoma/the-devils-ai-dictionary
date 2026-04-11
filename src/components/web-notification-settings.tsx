"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CONFIG_ENDPOINT = "/api/web/push/config";
const INSTALLATIONS_ENDPOINT = "/api/mobile/push/installations";
const SERVICE_WORKER_PATH = "/web-push-sw.js";
const STORED_ENDPOINT_KEY = "web-push-endpoint";
const STORED_DELIVERY_HOUR_KEY = "web-push-delivery-hour";
const DEFAULT_DELIVERY_HOUR = 9;

type PushPermissionState = NotificationPermission | "unsupported";

type WebPushConfig = {
  enabled: boolean;
  publicKey: string | null;
};

type WebNotificationState = {
  available: boolean;
  busy: boolean;
  enabled: boolean;
  error: string | null;
  permission: PushPermissionState;
  preferredDeliveryHour: number;
  supported: boolean;
};

const initialState: WebNotificationState = {
  available: false,
  busy: true,
  enabled: false,
  error: null,
  permission: "unsupported",
  preferredDeliveryHour: DEFAULT_DELIVERY_HOUR,
  supported: false,
};

function browserSupportsWebPush() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function formatSyncError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The site could not keep your notification preference in order.";
}

function readStoredEndpoint() {
  try {
    return window.localStorage.getItem(STORED_ENDPOINT_KEY);
  } catch {
    return null;
  }
}

function writeStoredEndpoint(endpoint: string) {
  try {
    window.localStorage.setItem(STORED_ENDPOINT_KEY, endpoint);
  } catch {
    // Ignore storage failures and rely on the live subscription state.
  }
}

function clearStoredEndpoint() {
  try {
    window.localStorage.removeItem(STORED_ENDPOINT_KEY);
  } catch {
    // Ignore storage failures and keep going.
  }
}

function readStoredDeliveryHour() {
  try {
    const rawValue = window.localStorage.getItem(STORED_DELIVERY_HOUR_KEY);

    if (rawValue == null) {
      return DEFAULT_DELIVERY_HOUR;
    }

    const parsed = Number.parseInt(rawValue, 10);
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 23
      ? parsed
      : DEFAULT_DELIVERY_HOUR;
  } catch {
    return DEFAULT_DELIVERY_HOUR;
  }
}

function writeStoredDeliveryHour(hour: number) {
  try {
    window.localStorage.setItem(
      STORED_DELIVERY_HOUR_KEY,
      String(Math.min(Math.max(hour, 0), 23)),
    );
  } catch {
    // Ignore storage failures and rely on the in-memory selection.
  }
}

function resolveEnvironment() {
  if (navigator.userAgent.includes("Electron")) {
    return "production" as const;
  }

  const hostname = window.location.hostname;

  if (
    hostname === "localhost" ||
    hostname.endsWith(".local")
  ) {
    return "development" as const;
  }

  return "production" as const;
}

function resolveTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

function formatDeliveryHour(hour: number) {
  return `${hour.toString().padStart(2, "0")}:00`;
}

function applicationServerKey(publicKey: string) {
  const normalized = publicKey.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const decoded = window.atob(padded);

  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

async function loadConfig() {
  const response = await fetch(CONFIG_ENDPOINT, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("The site could not load its web-push configuration.");
  }

  return (await response.json()) as WebPushConfig;
}

async function registerServiceWorker() {
  await navigator.serviceWorker.register(SERVICE_WORKER_PATH, { scope: "/" });
  return navigator.serviceWorker.ready;
}

async function syncInstallation(
  endpoint: string,
  optInStatus: "authorized" | "denied" | "notDetermined",
  preferredDeliveryHour: number,
) {
  const response = await fetch(INSTALLATIONS_ENDPOINT, {
    body: JSON.stringify({
      appVersion: "web",
      environment: resolveEnvironment(),
      locale: navigator.languages?.[0] ?? navigator.language ?? "en",
      optInStatus,
      platform: "web",
      preferredDeliveryHour,
      timeZone: resolveTimeZone(),
      token: endpoint,
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("The site could not save your notification preference.");
  }
}

function statusMessage({
  available,
  enabled,
  permission,
  preferredDeliveryHour,
  supported,
}: WebNotificationState) {
  if (!supported) {
    return "This browser is not equipped for web push here. Secure context, service workers, Push API: the usual bureaucracy.";
  }

  if (!available) {
    return "Web push is not configured for this deployment yet. The paperwork has not been filed.";
  }

  if (enabled) {
    return `The daily word has a standing booking for ${formatDeliveryHour(preferredDeliveryHour)} local time.`;
  }

  if (permission === "denied") {
    return "The browser has barred the door. Re-enable notifications there, then return here.";
  }

  if (permission === "default") {
    return `Switch this on and the browser can deliver the daily word around ${formatDeliveryHour(preferredDeliveryHour)} local time.`;
  }

  return "This browser is off the daily-word list.";
}

function homePromptTitle(state: WebNotificationState) {
  return state.permission === "denied"
    ? "The daily word is waiting outside"
    : "Let the daily word find you";
}

function homePromptMessage(state: WebNotificationState) {
  if (state.permission === "denied") {
    return "The browser has barred the door. Reopen notifications there if you want the daily word sent here.";
  }

  return `One entry a day, at the hour you choose. The standing booking is currently set to ${formatDeliveryHour(state.preferredDeliveryHour)} local time. Useful correspondence, not a campaign.`;
}

function useWebNotificationPreferences() {
  const [config, setConfig] = useState<WebPushConfig | null>(null);
  const [state, setState] = useState<WebNotificationState>(initialState);

  async function refreshState() {
    if (!browserSupportsWebPush()) {
      setState({
        available: false,
        busy: false,
        enabled: false,
        error: null,
        permission: "unsupported",
        preferredDeliveryHour: readStoredDeliveryHour(),
        supported: false,
      });
      return;
    }

    try {
      const nextConfig = await loadConfig();
      setConfig(nextConfig);

      if (!nextConfig.enabled || !nextConfig.publicKey) {
        setState({
          available: false,
          busy: false,
          enabled: false,
          error: null,
          permission: Notification.permission,
          preferredDeliveryHour: readStoredDeliveryHour(),
          supported: true,
        });
        return;
      }

      const registration = await registerServiceWorker();
      const subscription = await registration.pushManager.getSubscription();
      const storedEndpoint = readStoredEndpoint();
      const preferredDeliveryHour = readStoredDeliveryHour();
      const permission = Notification.permission;
      let syncError: string | null = null;

      if (subscription) {
        writeStoredEndpoint(subscription.endpoint);
        try {
          await syncInstallation(
            subscription.endpoint,
            permission === "granted" ? "authorized" : "denied",
            preferredDeliveryHour,
          );
        } catch (error) {
          syncError = formatSyncError(error);
        }
      } else if (storedEndpoint) {
        try {
          await syncInstallation(storedEndpoint, "denied", preferredDeliveryHour);
          clearStoredEndpoint();
        } catch (error) {
          syncError = formatSyncError(error);
        }
      }

      setState({
        available: true,
        busy: false,
        enabled: permission === "granted" && Boolean(subscription),
        error: syncError,
        permission,
        preferredDeliveryHour,
        supported: true,
      });
    } catch (error) {
      setState({
        available: false,
        busy: false,
        enabled: false,
        error:
          error instanceof Error
            ? error.message
            : "The site could not inspect browser notification support.",
        permission:
          typeof Notification === "undefined"
            ? "unsupported"
            : Notification.permission,
        preferredDeliveryHour: readStoredDeliveryHour(),
        supported: browserSupportsWebPush(),
      });
    }
  }

  useEffect(() => {
    void refreshState();
  }, []);

  async function enableNotifications() {
    if (!config?.publicKey) {
      throw new Error("Web notifications are not configured for this deployment yet.");
    }

    const registration = await registerServiceWorker();
    let subscription = await registration.pushManager.getSubscription();
    let permission = Notification.permission;

    if (permission !== "granted") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      throw new Error(
        permission === "denied"
          ? "The browser has notifications blocked in its settings."
          : "Notifications were left undecided.",
      );
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        applicationServerKey: applicationServerKey(config.publicKey),
        userVisibleOnly: true,
      });
    }

    writeStoredEndpoint(subscription.endpoint);
    await syncInstallation(
      subscription.endpoint,
      "authorized",
      state.preferredDeliveryHour,
    );
  }

  async function disableNotifications() {
    const registration = await registerServiceWorker();
    const subscription = await registration.pushManager.getSubscription();
    const endpoint = subscription?.endpoint ?? readStoredEndpoint();

    if (subscription) {
      const unsubscribed = await subscription.unsubscribe();

      if (!unsubscribed) {
        throw new Error("The browser refused to let go of the old push subscription.");
      }
    }

    if (endpoint) {
      await syncInstallation(endpoint, "denied", state.preferredDeliveryHour);
      clearStoredEndpoint();
    }
  }

  async function handleDeliveryHourChange(nextHour: number) {
    let errorMessage: string | null = null;
    const normalizedHour = Math.min(Math.max(nextHour, 0), 23);

    writeStoredDeliveryHour(normalizedHour);
    setState((current) => ({
      ...current,
      busy: true,
      error: null,
      preferredDeliveryHour: normalizedHour,
    }));

    try {
      const registration = browserSupportsWebPush()
        ? await registerServiceWorker()
        : null;
      const subscription = registration
        ? await registration.pushManager.getSubscription()
        : null;
      const endpoint = subscription?.endpoint ?? readStoredEndpoint();

      if (endpoint) {
        await syncInstallation(
          endpoint,
          subscription && Notification.permission === "granted"
            ? "authorized"
            : "denied",
          normalizedHour,
        );
      }
    } catch (error) {
      errorMessage = formatSyncError(error);
    } finally {
      await refreshState();

      if (errorMessage) {
        setState((current) => ({
          ...current,
          error: errorMessage,
        }));
      }
    }
  }

  async function handleToggle(nextEnabled: boolean) {
    let errorMessage: string | null = null;

    setState((current) => ({
      ...current,
      busy: true,
      error: null,
    }));

    try {
      if (nextEnabled) {
        await enableNotifications();
      } else {
        await disableNotifications();
      }
    } catch (error) {
      errorMessage = formatSyncError(error);
    } finally {
      await refreshState();

      if (errorMessage) {
        setState((current) => ({
          ...current,
          error: errorMessage,
        }));
      }
    }
  }

  return {
    handleDeliveryHourChange,
    handleToggle,
    state,
    statusText: statusMessage(state),
  };
}

export function WebNotificationHeroPrompt() {
  const { handleToggle, state } = useWebNotificationPreferences();

  if (!state.supported || !state.available || state.enabled) {
    return null;
  }

  const canRequestHere = state.permission !== "denied";

  return (
    <div className="mt-5 max-w-2xl rounded-[var(--radius-control)] border border-line bg-surface px-4 py-4">
      <p className="text-sm font-medium text-foreground">
        {homePromptTitle(state)}
      </p>
      <p className="mt-1 text-sm leading-7 text-foreground-soft">
        {state.busy ? "Saving the arrangement…" : homePromptMessage(state)}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {canRequestHere ? (
          <button
            type="button"
            className="button button-secondary"
            disabled={state.busy}
            onClick={() => {
              void handleToggle(true);
            }}
          >
            {state.busy ? "Saving the arrangement…" : "Send the daily word"}
          </button>
        ) : null}
        <Link
          href="/settings"
          className="text-sm font-medium text-accent hover:text-foreground"
        >
          {canRequestHere ? "Choose the hour in Settings" : "The full arrangement lives in Settings"}
        </Link>
      </div>
      {state.error ? (
        <p className="mt-2 text-sm leading-7 text-accent">{state.error}</p>
      ) : null}
    </div>
  );
}

export function WebNotificationSettings() {
  const { handleDeliveryHourChange, handleToggle, state, statusText } =
    useWebNotificationPreferences();

  return (
    <div className="space-y-4">
      <label className="flex items-start justify-between gap-4 rounded-[var(--radius-card)] border border-line bg-surface-strong p-4">
        <span className="min-w-0">
          <span className="block text-base font-medium text-foreground">
            Daily word notifications
          </span>
          <span className="mt-1 block text-sm leading-7 text-foreground-soft">
            One browser notification when the day&apos;s entry changes. One note, not a campaign.
          </span>
        </span>
        <input
          type="checkbox"
          checked={state.enabled}
          disabled={state.busy || !state.supported || !state.available}
          className="mt-1 size-5 shrink-0 accent-[var(--accent)]"
          aria-describedby="web-notification-status"
          onChange={(event) => {
            void handleToggle(event.currentTarget.checked);
          }}
        />
      </label>

      <p id="web-notification-status" className="text-sm leading-7 text-foreground-soft">
        {state.busy ? "Saving the arrangement…" : statusText}
      </p>

      <label className="block space-y-2">
        <span className="block text-sm font-medium text-foreground">
          Delivery hour
        </span>
        <select
          value={state.preferredDeliveryHour}
          disabled={state.busy || !state.supported || !state.available}
          className="w-full rounded-[var(--radius-card)] border border-line bg-surface-strong px-4 py-3 text-sm text-foreground"
          onChange={(event) => {
            void handleDeliveryHourChange(Number(event.currentTarget.value));
          }}
        >
          {Array.from({ length: 24 }, (_, hour) => (
            <option key={hour} value={hour}>
              {formatDeliveryHour(hour)}
            </option>
          ))}
        </select>
        <span className="block text-sm leading-7 text-foreground-soft">
          Local time in this browser. The machinery still needs the discipline to send hourly.
        </span>
      </label>

      {state.error ? (
        <p className="text-sm leading-7 text-accent">{state.error}</p>
      ) : null}
    </div>
  );
}
