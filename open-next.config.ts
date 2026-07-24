import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig();

// Wrangler deploys the middleware and default function into one Worker.
config.default.minify = true;
if (config.middleware?.external) {
  config.middleware.minify = true;
}

export default config;
