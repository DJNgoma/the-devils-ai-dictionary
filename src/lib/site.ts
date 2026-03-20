import { slugify } from "@/lib/utils";

export const siteConfig = {
  name: "The Devil's AI Dictionary",
  shortName: "Devil's AI Dictionary",
  description:
    "A sceptical field guide to the language machines, marketers, founders, and consultants use when they want to sound smarter than they are.",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://thedevilsaidictionary.com",
};

export const navigation = [
  { href: "/", label: "Home" },
  { href: "/dictionary", label: "Dictionary" },
  { href: "/categories", label: "Categories" },
  { href: "/random", label: "Random" },
  { href: "/about", label: "About" },
  { href: "/search", label: "Search" },
] as const;

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

export const featuredEntrySlug = "agentic-ai";

export const difficultyOptions = ["beginner", "intermediate", "advanced"] as const;
export const technicalDepthOptions = ["low", "medium", "high"] as const;
export const hypeLevelOptions = ["low", "medium", "high", "severe"] as const;

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

export const hypeLevelLabels: Record<HypeLevel, string> = {
  low: "Low hype",
  medium: "Medium hype",
  high: "High hype",
  severe: "Red-flag jargon",
};

export const categoryDefinitions = [
  {
    title: "Core concepts",
    description:
      "Terms people use as if they were self-explanatory, usually before the definitions start fraying.",
  },
  {
    title: "Cultural terms",
    description:
      "The social weirdness around AI: belief, taste, cringe, status games, and the internet behaving as it usually does when handed a new machine.",
  },
  {
    title: "Model building",
    description:
      "How models are trained, tuned, evaluated, and occasionally overpraised.",
  },
  {
    title: "Model usage",
    description:
      "What it means to actually run a model in production, where invoices and latency live.",
  },
  {
    title: "Agents and workflows",
    description:
      "Automation patterns, orchestration, and the difference between useful autonomy and stagecraft.",
  },
  {
    title: "Retrieval and memory",
    description:
      "How systems fetch context, store traces, and pretend they remember you.",
  },
  {
    title: "Product and vendor terms",
    description:
      "Company names, product labels, and the branding haze around them.",
  },
  {
    title: "Safety and evaluation",
    description:
      "Guardrails, tests, preferences, and the uncomfortable gap between lab scores and reality.",
  },
  {
    title: "Infrastructure and deployment",
    description:
      "The machinery underneath the demo: compute, serving, throughput, and operational trade-offs.",
  },
  {
    title: "Hype words and red-flag jargon",
    description:
      "Terms whose job is often to impress a room before they explain anything.",
  },
  {
    title: "Economics and operations of AI",
    description:
      "Cost, labour, incentives, and the very unmagical business of running AI systems.",
  },
] as const;

export type CategoryTitle = (typeof categoryDefinitions)[number]["title"];

export const categoryMap = categoryDefinitions.map((category) => ({
  ...category,
  slug: slugify(category.title),
}));

export function getCategoryBySlug(slug: string) {
  return categoryMap.find((category) => category.slug === slug);
}
