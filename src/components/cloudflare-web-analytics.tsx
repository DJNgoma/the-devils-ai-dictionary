import Script from "next/script";

const webAnalyticsToken = process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN;

export function CloudflareWebAnalytics() {
  if (!webAnalyticsToken) {
    return null;
  }

  return (
    <Script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({
        token: webAnalyticsToken,
      })}
      strategy="afterInteractive"
    />
  );
}
