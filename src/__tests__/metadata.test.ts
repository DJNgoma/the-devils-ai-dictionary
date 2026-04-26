import type { Metadata } from "next";
import { describe, expect, it } from "vitest";
import { absoluteUrl, buildMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

type OgShape = {
  type: "website" | "article";
  url: string;
  title: string;
  description: string;
  siteName: string;
  images: Array<{ url: string; width: number; height: number; alt: string }>;
};

function og(meta: Metadata): OgShape {
  return meta.openGraph as unknown as OgShape;
}

function twitterImages(meta: Metadata): string[] {
  return (meta.twitter as unknown as { images: string[] }).images;
}

describe("absoluteUrl", () => {
  it("defaults to the site root", () => {
    expect(absoluteUrl()).toBe(`${siteConfig.url}/`);
  });

  it("resolves a relative path against the site origin", () => {
    expect(absoluteUrl("/dictionary/agent")).toBe(
      `${siteConfig.url}/dictionary/agent`,
    );
  });

  it("preserves query strings and fragments", () => {
    expect(absoluteUrl("/search?q=agent#results")).toBe(
      `${siteConfig.url}/search?q=agent#results`,
    );
  });
});

describe("buildMetadata", () => {
  const baseInput = {
    title: "Agent",
    description: "A field guide entry for the term Agent.",
    path: "/dictionary/agent",
  };

  it("emits a canonical URL and OpenGraph defaults for website pages", () => {
    const meta = buildMetadata({
      title: "Home",
      description: "Landing page",
      path: "/",
    });

    expect(meta.title).toBe("Home");
    expect(meta.description).toBe("Landing page");
    expect(meta.alternates?.canonical).toBe(`${siteConfig.url}/`);
    expect(og(meta)).toMatchObject({
      type: "website",
      url: `${siteConfig.url}/`,
      title: "Home",
      description: "Landing page",
      siteName: siteConfig.name,
    });

    expect(og(meta).images[0]).toEqual({
      url: `${siteConfig.url}/opengraph-image`,
      width: 1200,
      height: 630,
      alt: "Home",
    });

    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Home",
      description: "Landing page",
    });
    expect(twitterImages(meta)).toEqual([`${siteConfig.url}/opengraph-image`]);
  });

  it("uses the per-entry OpenGraph image for dictionary articles", () => {
    const meta = buildMetadata({ ...baseInput, type: "article" });

    expect(og(meta).type).toBe("article");
    expect(og(meta).images[0]).toMatchObject({
      url: `${siteConfig.url}/dictionary/agent/opengraph-image`,
      alt: "Agent",
    });
    expect(twitterImages(meta)).toEqual([
      `${siteConfig.url}/dictionary/agent/opengraph-image`,
    ]);
  });

  it("falls back to the default OpenGraph image for non-dictionary articles", () => {
    const meta = buildMetadata({
      title: "Update",
      description: "Editorial update",
      path: "/updates/spring-cleanup",
      type: "article",
    });

    expect(og(meta).images[0]).toMatchObject({
      url: `${siteConfig.url}/opengraph-image`,
    });
    expect(twitterImages(meta)).toEqual([`${siteConfig.url}/opengraph-image`]);
  });

  it("ignores the per-entry image when a dictionary path is rendered as a website", () => {
    const meta = buildMetadata(baseInput);

    expect(og(meta).type).toBe("website");
    expect(og(meta).images[0]).toMatchObject({
      url: `${siteConfig.url}/opengraph-image`,
    });
  });

  it("treats the dictionary index without a trailing slash as a non-entry path", () => {
    const meta = buildMetadata({
      title: "Dictionary",
      description: "Browse every term.",
      path: "/dictionary",
      type: "article",
    });

    expect(og(meta).images[0]).toMatchObject({
      url: `${siteConfig.url}/opengraph-image`,
    });
    expect(twitterImages(meta)).toEqual([`${siteConfig.url}/opengraph-image`]);
  });
});
