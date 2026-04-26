"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AppSheet } from "@/components/app-sheet";
import { BrandMark } from "@/components/brand-mark";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useMobileShell } from "@/components/mobile-shell-controller";
import {
  getMobileBackHref,
  getMobileChromeTitle,
  mobileSecondaryNavigation,
} from "@/lib/site";

export function MobileAppBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isMenuOpen, closeMenu, toggleMenu } = useMobileShell();
  const backHref = getMobileBackHref(pathname);
  const title = getMobileChromeTitle(pathname);

  return (
    <>
      <header className="mobile-app-bar md:hidden">
        <div className="mobile-app-bar__inner">
          {backHref ? (
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  router.back();
                  return;
                }

                router.push(backHref);
              }}
              className="button button-ghost"
              aria-label="Go back"
            >
              Back
            </button>
          ) : (
            <Link href="/" className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
              <span className="brand-mark-mobile">
                <BrandMark className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="mobile-app-bar__eyebrow">Field guide</span>
                <span className="mobile-app-bar__title">The Devil&apos;s AI Dictionary</span>
              </span>
            </Link>
          )}

          {backHref ? (
            <div className="min-w-0 flex-1 px-3">
              <p className="mobile-app-bar__title truncate text-center">{title}</p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={toggleMenu}
            className="button button-ghost shrink-0"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu-sheet"
          >
            Menu
          </button>
        </div>
      </header>

      <AppSheet
        id="mobile-menu"
        open={isMenuOpen}
        onClose={closeMenu}
        title="More"
        description="Secondary routes and appearance settings."
        className="md:hidden"
      >
        <div id="mobile-menu-sheet" className="space-y-5">
          <div className="grid gap-2">
            {mobileSecondaryNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="button button-secondary justify-between"
                onClick={closeMenu}
              >
                <span>{item.label}</span>
                <span className="text-foreground-soft">Open</span>
              </Link>
            ))}
          </div>
          <div className="surface p-4">
            <p className="page-kicker">Appearance</p>
            <div className="mt-3">
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </AppSheet>
    </>
  );
}
