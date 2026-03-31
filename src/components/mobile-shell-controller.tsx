"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type MobileShellContextValue = {
  isMenuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
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
      setSheetOpen,
    }),
    [closeMenu, isMenuOpen, openMenu, setSheetOpen, toggleMenu],
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
