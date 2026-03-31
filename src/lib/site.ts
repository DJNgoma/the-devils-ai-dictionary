import { slugify } from "@/lib/utils";
import {
  categoryDefinitions,
  difficultyOptions,
  hypeLevelOptions,
  technicalDepthOptions,
} from "@/lib/content-catalog.mjs";

export const siteConfig = {
  name: "The Devil's AI Dictionary",
  shortName: "Devil's AI Dictionary",
  description:
    "A sceptical field guide to the language machines, marketers, founders, and consultants use when they want to sound smarter than they are.",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://thedevilsaidictionary.com",
  repoUrl: "https://github.com/DJNgoma/the-devils-ai-dictionary",
  contributeUrl:
    "https://github.com/DJNgoma/the-devils-ai-dictionary/blob/main/CONTRIBUTING.md",
};

export const navigation = [
  { href: "/", label: "Home" },
  { href: "/dictionary", label: "Dictionary" },
  { href: "/categories", label: "Categories" },
  { href: "/random", label: "Random" },
  { href: "/about", label: "About" },
  { href: "/search", label: "Search" },
] as const;

export const mobilePrimaryNavigation = [
  {
    id: "home",
    href: "/",
    label: "Home",
    icon: "home",
  },
  {
    id: "browse",
    href: "/dictionary",
    label: "Browse",
    icon: "book",
  },
  {
    id: "search",
    href: "/search",
    label: "Search",
    icon: "search",
  },
  {
    id: "saved",
    href: "/saved",
    label: "Saved",
    icon: "bookmark",
  },
] as const;

export const mobileSecondaryNavigation = [
  { href: "/book", label: "Book" },
  { href: "/categories", label: "Categories" },
  { href: "/how-to-read", label: "Guide" },
  { href: "/about", label: "About" },
  { href: "/random", label: "Random" },
] as const;

export type MobilePrimaryNavItem = (typeof mobilePrimaryNavigation)[number];
export type MobilePrimaryNavId = MobilePrimaryNavItem["id"];

export function getMobilePrimaryNavId(pathname: string): MobilePrimaryNavId {
  if (pathname === "/search" || pathname.startsWith("/search/")) {
    return "search";
  }

  if (pathname === "/saved" || pathname.startsWith("/saved/")) {
    return "saved";
  }

  if (
    pathname === "/dictionary" ||
    pathname.startsWith("/dictionary/") ||
    pathname === "/categories" ||
    pathname.startsWith("/categories/")
  ) {
    return "browse";
  }

  return "home";
}

export function isMobilePrimaryNavActive(
  pathname: string,
  navId: MobilePrimaryNavId,
) {
  return getMobilePrimaryNavId(pathname) === navId;
}

export function getMobileChromeTitle(pathname: string) {
  if (pathname === "/saved") {
    return "Saved";
  }

  if (pathname === "/search") {
    return "Search";
  }

  if (pathname === "/dictionary") {
    return "Browse";
  }

  if (pathname.startsWith("/dictionary/")) {
    return "Entry";
  }

  if (pathname === "/categories") {
    return "Categories";
  }

  if (pathname.startsWith("/categories/")) {
    return "Category";
  }

  if (pathname === "/book") {
    return "Book";
  }

  if (pathname === "/how-to-read") {
    return "Guide";
  }

  if (pathname === "/about") {
    return "About";
  }

  if (pathname === "/random") {
    return "Random";
  }

  return "The Devil's AI Dictionary";
}

export function getMobileBackHref(pathname: string) {
  if (pathname.startsWith("/dictionary/")) {
    return "/dictionary";
  }

  if (pathname.startsWith("/categories/")) {
    return "/categories";
  }

  return null;
}

export const themeOptions = [
  {
    value: "book",
    label: "Book",
    swatches: ["#b2552f", "#26594a", "#f4efe6"],
  },
  {
    value: "codex",
    label: "Codex",
    swatches: ["#0169cc", "#751ed9", "#ffffff"],
  },
  {
    value: "absolutely",
    label: "Absolutely",
    swatches: ["#cc7d5e", "#f9f9f7", "#2d2d2b"],
  },
  {
    value: "night",
    label: "Night",
    swatches: ["#e4864d", "#5ec9a1", "#12100d"],
  },
] as const;

export type ThemeName = (typeof themeOptions)[number]["value"];

export type Difficulty = (typeof difficultyOptions)[number];
export type TechnicalDepth = (typeof technicalDepthOptions)[number];
export type HypeLevel = (typeof hypeLevelOptions)[number];

export const difficultyLabels: Record<Difficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const technicalDepthLabels: Record<TechnicalDepth, string> = {
  low: "Light",
  medium: "Practical",
  high: "Deep",
};

export type CategoryTitle = (typeof categoryDefinitions)[number]["title"];

export const categoryMap = categoryDefinitions.map((category) => ({
  ...category,
  slug: slugify(category.title),
}));

export function getCategoryBySlug(slug: string) {
  return categoryMap.find((category) => category.slug === slug);
}
