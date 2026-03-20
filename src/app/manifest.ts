import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Devil's AI Dictionary",
    short_name: "AI Dictionary",
    description:
      "A sceptical field guide to AI language, hype, and operational reality.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4efe6",
    theme_color: "#b2552f",
  };
}
