import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Source_Serif_4 } from "next/font/google";
import { BookmarkProvider } from "@/components/bookmark-provider";
import { CloudflareWebAnalytics } from "@/components/cloudflare-web-analytics";
import { MobileAppBar } from "@/components/mobile-app-bar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MobileShellController } from "@/components/mobile-shell-controller";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { absoluteUrl } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Source_Serif_4({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  appleWebApp: {
    capable: true,
    title: siteConfig.shortName,
    statusBarStyle: "default",
  },
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    type: "website",
    url: absoluteUrl("/"),
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: absoluteUrl("/opengraph-image"),
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [absoluteUrl("/opengraph-image")],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#12100d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeBootScript = `
    try {
      var theme = localStorage.getItem("site-theme");
      var allowed = ["book", "codex", "absolutely", "night"];
      document.documentElement.setAttribute(
        "data-theme",
        allowed.includes(theme) ? theme : "book"
      );
    } catch (error) {
      document.documentElement.setAttribute("data-theme", "book");
    }
  `;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full">
        <ThemeProvider>
          <BookmarkProvider>
            <MobileShellController>
              <div className="site-chrome min-h-full">
                <SiteHeader />
                <MobileAppBar />
                <main className="app-shell-main flex-1">{children}</main>
                <SiteFooter />
                <MobileBottomNav />
              </div>
            </MobileShellController>
          </BookmarkProvider>
        </ThemeProvider>
        <CloudflareWebAnalytics />
      </body>
    </html>
  );
}
