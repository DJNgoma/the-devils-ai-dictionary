import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}

export function entryOpenGraphImagePath(slug: string) {
  return `/og-images/${encodeURIComponent(slug)}.png`;
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
              ? absoluteUrl(entryOpenGraphImagePath(path.slice("/dictionary/".length)))
              : absoluteUrl("/og-images/home.png"),
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
          ? absoluteUrl(entryOpenGraphImagePath(path.slice("/dictionary/".length)))
          : absoluteUrl("/og-images/home.png"),
      ],
    },
  };
}
