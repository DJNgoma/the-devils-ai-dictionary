import { ImageResponse } from "next/og";
import { HomeShareCard } from "@/components/og-card";

export const dynamic = "force-static";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<HomeShareCard />, size);
}
