"use client";

import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type NativeCurrentWord = {
  devilDefinition: string;
  plainDefinition: string;
  slug: string;
  source: "manualRefresh" | "notificationTap" | "phoneSync" | "seeded";
  title: string;
  updatedAt: string;
  warningLabel?: string;
};

export type NativeCurrentWordState = {
  catalogVersion?: string;
  currentWord?: NativeCurrentWord;
  isNativePushAvailable: boolean;
  pendingNavigationPath?: string;
  pushAuthorizationStatus:
    | "authorized"
    | "denied"
    | "ephemeral"
    | "notDetermined"
    | "provisional"
    | "unknown";
  pushTokenAvailable: boolean;
};

type CurrentWordPlugin = {
  getState: () => Promise<NativeCurrentWordState>;
  refreshCurrentWord: () => Promise<{ currentWord?: NativeCurrentWord }>;
  requestPushPermission: () => Promise<NativeCurrentWordState>;
  consumePendingNavigation: (options?: { path?: string }) => Promise<NativeCurrentWordState>;
  addListener: (
    eventName: "currentWordChanged" | "pendingNavigationChanged" | "pushStateChanged",
    listenerFunc: (state: NativeCurrentWordState) => void,
  ) => Promise<PluginListenerHandle>;
};

const CurrentWord = registerPlugin<CurrentWordPlugin>("CurrentWord");

export function isNativeIOSCurrentWordAvailable() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export async function getNativeCurrentWordState() {
  if (!isNativeIOSCurrentWordAvailable()) {
    return null;
  }

  try {
    return await CurrentWord.getState();
  } catch {
    return null;
  }
}

export async function requestNativePushPermission() {
  if (!isNativeIOSCurrentWordAvailable()) {
    return null;
  }

  return CurrentWord.requestPushPermission();
}

export async function consumePendingNativeNavigation(path?: string) {
  if (!isNativeIOSCurrentWordAvailable()) {
    return null;
  }

  return CurrentWord.consumePendingNavigation(path ? { path } : undefined);
}

export async function listenToNativeCurrentWord(
  eventName: "currentWordChanged" | "pendingNavigationChanged" | "pushStateChanged",
  listener: (state: NativeCurrentWordState) => void,
) {
  if (!isNativeIOSCurrentWordAvailable()) {
    return null;
  }

  try {
    return await CurrentWord.addListener(eventName, listener);
  } catch {
    return null;
  }
}
