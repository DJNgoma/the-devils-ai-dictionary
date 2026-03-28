"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { App } from "@capacitor/app";
import { Keyboard } from "@capacitor/keyboard";
import {
  Capacitor,
  SystemBars,
  SystemBarsStyle,
} from "@capacitor/core";
import { resolveAndroidBackAction } from "@/lib/mobile-shell";
import { useSiteTheme } from "@/components/theme-provider";

type MobileShellContextValue = {
  isMenuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
  registerSheet: (id: string, close: () => void) => () => void;
  setSheetOpen: (id: string, open: boolean) => void;
};

const MobileShellContext = createContext<MobileShellContextValue | null>(null);

function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export function MobileShellController({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useSiteTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openSheetIds, setOpenSheetIds] = useState<string[]>([]);
  const sheetClosersRef = useRef(new Map<string, () => void>());
  const openSheetIdsRef = useRef<string[]>([]);

  useEffect(() => {
    openSheetIdsRef.current = openSheetIds;
  }, [openSheetIds]);

  useEffect(() => {
    const sheetOpen = openSheetIds.length > 0;
    document.documentElement.classList.toggle("sheet-open", sheetOpen);

    return () => {
      document.documentElement.classList.remove("sheet-open");
    };
  }, [openSheetIds.length]);

  useEffect(() => {
    if (!isNativeApp()) {
      return;
    }

    const style =
      theme === "night" ? SystemBarsStyle.Light : SystemBarsStyle.Dark;

    void SystemBars.setStyle({ style }).catch(() => undefined);
  }, [theme]);

  useEffect(() => {
    if (!isNativeApp()) {
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
    if (!isNativeApp() || Capacitor.getPlatform() !== "android") {
      return;
    }

    let listenerHandle: Awaited<ReturnType<typeof App.addListener>> | null = null;

    void App.addListener("backButton", ({ canGoBack }) => {
      const action = resolveAndroidBackAction({
        hasOpenSheet: openSheetIdsRef.current.length > 0,
        canGoBack,
      });

      if (action === "close-sheet") {
        const topSheetId = openSheetIdsRef.current.at(-1);

        if (topSheetId) {
          sheetClosersRef.current.get(topSheetId)?.();
        }

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
  }, []);

  const openMenu = useCallback(() => {
    setIsMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((current) => !current);
  }, []);

  const registerSheet = useCallback((id: string, close: () => void) => {
    sheetClosersRef.current.set(id, close);

    return () => {
      sheetClosersRef.current.delete(id);
      setOpenSheetIds((current) => current.filter((value) => value !== id));
    };
  }, []);

  const setSheetOpen = useCallback((id: string, open: boolean) => {
    setOpenSheetIds((current) => {
      const next = current.filter((value) => value !== id);
      return open ? [...next, id] : next;
    });
  }, []);

  const value = useMemo(
    () => ({
      isMenuOpen,
      openMenu,
      closeMenu,
      toggleMenu,
      registerSheet,
      setSheetOpen,
    }),
    [
      closeMenu,
      isMenuOpen,
      openMenu,
      registerSheet,
      setSheetOpen,
      toggleMenu,
    ],
  );

  return (
    <MobileShellContext.Provider value={value}>
      {children}
    </MobileShellContext.Provider>
  );
}

export function useMobileShell() {
  const context = useContext(MobileShellContext);

  if (!context) {
    throw new Error("useMobileShell must be used inside MobileShellController.");
  }

  return context;
}
