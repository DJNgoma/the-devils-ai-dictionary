import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig();

// Keep the default function unminified. OpenNext's minified server output turns
// Next's instrumentation hook into a dynamic require, which Workers cannot load.
// The middleware bundle can still be minified safely.
if (config.middleware?.external) {
  config.middleware.minify = true;
}

export default config;
