import type { MetadataRoute } from "next";
import { getAllEntries, getCategoryStats } from "@/lib/content";
import { absoluteUrl } from "@/lib/metadata";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [entries, categories] = await Promise.all([
    getAllEntries(),
    getCategoryStats(),
  ]);

  const staticRoutes = [
    "/",
    "/book",
    "/dictionary",
    "/categories",
    "/about",
    "/how-to-read",
    "/search",
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: absoluteUrl(route),
      lastModified: new Date(),
    })),
    ...entries.map((entry) => ({
      url: absoluteUrl(`/dictionary/${entry.slug}`),
      lastModified: new Date(entry.updatedAt),
    })),
    ...categories.map((category) => ({
      url: absoluteUrl(`/categories/${category.slug}`),
      lastModified: new Date(),
    })),
  ];
}
