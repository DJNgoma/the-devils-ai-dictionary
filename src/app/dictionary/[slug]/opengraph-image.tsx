import { ImageResponse } from "next/og";
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
      <div
        style={{
          background:
            "linear-gradient(135deg, #12100d 0%, #1b1612 55%, #2a2119 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          color: "#efe6d7",
        }}
      >
        <div
          style={{
            fontSize: 24,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            opacity: 0.72,
          }}
        >
          Dictionary entry
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
          <div style={{ fontSize: 70, lineHeight: 1.04, fontWeight: 700 }}>
            {entry?.title ?? "The Devil's AI Dictionary"}
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.42, maxWidth: "920px" }}>
            {entry?.devilDefinition ??
              "A sceptical field guide to AI language, hype, and operational reality."}
          </div>
        </div>
        <div style={{ fontSize: 22, opacity: 0.78 }}>
          The Devil&apos;s AI Dictionary
        </div>
      </div>
    ),
    size,
  );
}
