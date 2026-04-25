import { ImageResponse } from "next/og";
import { HomeShareCard } from "@/components/og-card";
import { loadOgFonts } from "@/lib/og-fonts";

export const dynamic = "force-static";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function OpenGraphImage() {
  const fonts = await loadOgFonts();
  return new ImageResponse(<HomeShareCard />, { ...size, fonts });
}
