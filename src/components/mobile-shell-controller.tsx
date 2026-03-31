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

type MobileShellContextValue = {
  isMenuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
  hasOpenSheet: boolean;
  closeTopSheet: () => void;
  registerSheet: (id: string, close: () => void) => () => void;
  setSheetOpen: (id: string, open: boolean) => void;
};

const MobileShellContext = createContext<MobileShellContextValue | null>(null);

export function MobileShellController({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openSheetIds, setOpenSheetIds] = useState<string[]>([]);
  const sheetClosersRef = useRef(new Map<string, () => void>());

  useEffect(() => {
    const sheetOpen = openSheetIds.length > 0;
    document.documentElement.classList.toggle("sheet-open", sheetOpen);

    return () => {
      document.documentElement.classList.remove("sheet-open");
    };
  }, [openSheetIds.length]);

  const openMenu = useCallback(() => {
    setIsMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((current) => !current);
  }, []);

  const closeTopSheet = useCallback(() => {
    const topSheetId = openSheetIds.at(-1);

    if (topSheetId) {
      sheetClosersRef.current.get(topSheetId)?.();
    }
  }, [openSheetIds]);

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
      hasOpenSheet: openSheetIds.length > 0,
      closeTopSheet,
      registerSheet,
      setSheetOpen,
    }),
    [
      closeTopSheet,
      closeMenu,
      openSheetIds.length,
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
