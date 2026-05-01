import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  if (new URL(siteConfig.url).hostname === "staging.thedevilsaidictionary.com") {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/random"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
