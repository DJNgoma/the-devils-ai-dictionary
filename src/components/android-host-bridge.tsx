"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Keyboard } from "@capacitor/keyboard";
import {
  Capacitor,
  SystemBars,
  SystemBarsStyle,
  type PluginListenerHandle,
} from "@capacitor/core";
import { resolveAndroidBackAction } from "@/lib/mobile-shell";
import { useMobileShell } from "@/components/mobile-shell-controller";
import { useSiteTheme } from "@/components/theme-provider";

function isAndroidCapacitorHost() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export function AndroidHostBridge() {
  const { closeTopSheet, hasOpenSheet } = useMobileShell();
  const { theme } = useSiteTheme();

  useEffect(() => {
    if (!isAndroidCapacitorHost()) {
      return;
    }

    const style =
      theme === "night" ? SystemBarsStyle.Light : SystemBarsStyle.Dark;

    void SystemBars.setStyle({ style }).catch(() => undefined);
  }, [theme]);

  useEffect(() => {
    if (!isAndroidCapacitorHost()) {
      return;
    }

    const openKeyboard = () => {
      document.documentElement.classList.add("keyboard-open");
    };
    const closeKeyboard = () => {
      document.documentElement.classList.remove("keyboard-open");
    };

    let cancelled = false;

    const attachListeners = async () => {
      const listeners = await Promise.all([
        Keyboard.addListener("keyboardWillShow", openKeyboard),
        Keyboard.addListener("keyboardDidShow", openKeyboard),
        Keyboard.addListener("keyboardWillHide", closeKeyboard),
        Keyboard.addListener("keyboardDidHide", closeKeyboard),
      ]);

      if (cancelled) {
        await Promise.all(listeners.map((listener) => listener.remove()));
      }

      return listeners;
    };

    const listenersPromise = attachListeners();

    return () => {
      cancelled = true;
      document.documentElement.classList.remove("keyboard-open");
      void listenersPromise.then((listeners) =>
        Promise.all(listeners.map((listener) => listener.remove())),
      );
    };
  }, []);

  useEffect(() => {
    if (!isAndroidCapacitorHost()) {
      return;
    }

    let listenerHandle: PluginListenerHandle | null = null;

    void App.addListener("backButton", ({ canGoBack }: { canGoBack: boolean }) => {
      const action = resolveAndroidBackAction({
        hasOpenSheet,
        canGoBack,
      });

      if (action === "close-sheet") {
        closeTopSheet();
        return;
      }

      if (action === "history-back") {
        window.history.back();
        return;
      }

      void App.minimizeApp();
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      void listenerHandle?.remove();
    };
  }, [closeTopSheet, hasOpenSheet]);

  return null;
}
