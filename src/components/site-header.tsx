"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { navigation } from "@/lib/site";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/75 backdrop-blur-xl">
      <div className="page-shell flex flex-col gap-4 py-4 sm:py-5">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="group min-w-0">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-foreground-soft">
              Field guide
            </p>
            <p className="truncate font-display text-xl font-semibold tracking-tight text-foreground group-hover:text-accent">
              The Devil&apos;s AI Dictionary
            </p>
          </Link>
          <div className="hidden md:block">
            <ThemeSwitcher />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap gap-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm text-foreground-soft hover:text-foreground",
                  isActive(pathname, item.href) &&
                    "bg-accent-soft text-accent",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="md:hidden">
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
