"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isMobilePrimaryNavActive,
  mobilePrimaryNavigation,
  type MobilePrimaryNavItem,
} from "@/lib/site";
import { cn } from "@/lib/utils";

function NavIcon({ item }: { item: MobilePrimaryNavItem }) {
  if (item.icon === "home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current">
        <path d="M4 10.5 12 4l8 6.5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6.5 9.75V20h11V9.75" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (item.icon === "search") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current">
        <circle cx="11" cy="11" r="5.75" strokeWidth="1.8" />
        <path d="m16 16 4 4" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (item.icon === "bookmark") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current">
        <path
          d="M7 4.75h10a1 1 0 0 1 1 1V20l-6-3.75L6 20V5.75a1 1 0 0 1 1-1Z"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current">
      <path d="M6 5.5h12" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 10.5h12" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 15.5h8.5" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 20h12" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-nav md:hidden" aria-label="Primary">
      <div className="mobile-bottom-nav__inner">
        {mobilePrimaryNavigation.map((item) => {
          const active = isMobilePrimaryNavActive(pathname, item.id);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("mobile-bottom-nav__item", active && "is-active")}
              aria-current={active ? "page" : undefined}
            >
              <NavIcon item={item} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
