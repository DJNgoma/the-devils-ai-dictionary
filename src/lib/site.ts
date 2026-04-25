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
  appStoreUrl:
    "https://apps.apple.com/us/app/the-devils-ai-dictionary/id6761293350",
  repoUrl: "https://github.com/DJNgoma/the-devils-ai-dictionary",
  contributeUrl:
    "https://github.com/DJNgoma/the-devils-ai-dictionary/blob/main/CONTRIBUTING.md",
};

export const navigation = [
  { href: "/", label: "Home" },
  { href: "/dictionary", label: "Dictionary" },
  { href: "/updates", label: "Updates" },
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
    id: "search",
    href: "/dictionary",
    label: "Search",
    icon: "search",
  },
  {
    id: "categories",
    href: "/categories",
    label: "Categories",
    icon: "grid",
  },
  {
    id: "saved",
    href: "/saved",
    label: "Saved",
    icon: "bookmark",
  },
] as const;

export const mobileSecondaryNavigation = [
  { href: "/settings", label: "Settings" },
  { href: "/book", label: "Book" },
  { href: "/updates", label: "Updates" },
  { href: "/how-to-read", label: "Guide" },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/random", label: "Random" },
] as const;

export type MobilePrimaryNavItem = (typeof mobilePrimaryNavigation)[number];
export type MobilePrimaryNavId = MobilePrimaryNavItem["id"];

export function getMobilePrimaryNavId(pathname: string): MobilePrimaryNavId {
  if (
    pathname === "/dictionary" ||
    pathname.startsWith("/dictionary/")
  ) {
    return "search";
  }

  if (
    pathname === "/categories" ||
    pathname.startsWith("/categories/")
  ) {
    return "categories";
  }

  if (pathname === "/saved" || pathname.startsWith("/saved/")) {
    return "saved";
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

  if (pathname === "/dictionary") {
    return "Search";
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

  if (pathname === "/updates") {
    return "Updates";
  }

  if (pathname === "/how-to-read") {
    return "Guide";
  }

  if (pathname === "/about") {
    return "About";
  }

  if (pathname === "/privacy") {
    return "Privacy";
  }

  if (pathname === "/settings") {
    return "Settings";
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
    appearance: "light",
    swatches: ["#b2552f", "#26594a", "#f4efe6"],
  },
  {
    value: "codex",
    label: "Codex",
    appearance: "light",
    swatches: ["#0169cc", "#751ed9", "#ffffff"],
  },
  {
    value: "absolutely",
    label: "Absolutely",
    appearance: "light",
    swatches: ["#cc7d5e", "#f9f9f7", "#2d2d2b"],
  },
  {
    value: "devil",
    label: "Devil",
    appearance: "dark",
    swatches: ["#c92a2a", "#f08b57", "#170909"],
  },
  {
    value: "night",
    label: "Night",
    appearance: "dark",
    swatches: ["#e4864d", "#5ec9a1", "#12100d"],
  },
] as const;

export type ThemeOption = (typeof themeOptions)[number];
export type ThemeName = ThemeOption["value"];
export type ThemeAppearance = ThemeOption["appearance"];
export type ThemeMode = "auto" | "manual";

export const themeAppearanceLabels: Record<ThemeAppearance, string> = {
  light: "Light editions",
  dark: "Dark editions",
};

export const themeOptionsByAppearance: Record<ThemeAppearance, ThemeOption[]> = {
  light: themeOptions.filter((option) => option.appearance === "light"),
  dark: themeOptions.filter((option) => option.appearance === "dark"),
};

export function resolveAutoTheme(prefersDark: boolean): ThemeName {
  return prefersDark ? "night" : "book";
}

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
