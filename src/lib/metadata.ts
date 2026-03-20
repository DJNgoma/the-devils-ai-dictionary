import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}

type MetadataInput = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
};

export function buildMetadata({
  title,
  description,
  path,
  type = "website",
}: MetadataInput): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type,
      url,
      title,
      description,
      siteName: siteConfig.name,
      images: [
        {
          url:
            type === "article" && path.startsWith("/dictionary/")
              ? absoluteUrl(`${path}/opengraph-image`)
              : absoluteUrl("/opengraph-image"),
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        type === "article" && path.startsWith("/dictionary/")
          ? absoluteUrl(`${path}/opengraph-image`)
          : absoluteUrl("/opengraph-image"),
      ],
    },
  };
}
