import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const isMobileExport = process.env.NEXT_OUTPUT_MODE === "export";

if (process.env.NODE_ENV === "development" && !isMobileExport) {
  initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = isMobileExport
  ? {
      output: "export",
      trailingSlash: true,
    }
  : {};

export default nextConfig;
