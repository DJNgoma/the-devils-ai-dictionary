import { ImageResponse } from "next/og";
import { EntryShareCard } from "@/components/og-card";
import { getEntryBySlug } from "@/lib/content";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

type EntryOgImageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EntryOpenGraphImage({
  params,
}: EntryOgImageProps) {
  const { slug } = await params;
  const entry = await getEntryBySlug(slug);

  return new ImageResponse(
    (
      <EntryShareCard
        title={entry?.title ?? "The Devil's AI Dictionary"}
        definition={
          entry?.plainDefinition ??
          entry?.devilDefinition ??
          "A sceptical field guide to AI language, hype, and operational reality."
        }
        letter={entry?.letter}
      />
    ),
    size,
  );
}
