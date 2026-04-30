import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { MobileAppBar } from "@/components/mobile-app-bar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MobileShellController } from "@/components/mobile-shell-controller";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { absoluteUrl } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const display = localFont({
  variable: "--font-display",
  display: "swap",
  src: [
    {
      path: "./fonts/fraunces-500.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/fraunces-600.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/fraunces-700.ttf",
      weight: "700",
      style: "normal",
    },
  ],
});

const body = localFont({
  variable: "--font-body",
  display: "swap",
  src: [
    {
      path: "./fonts/source-serif-4-400.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/source-serif-4-500.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/source-serif-4-600.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/source-serif-4-700.ttf",
      weight: "700",
      style: "normal",
    },
  ],
});

const mono = localFont({
  variable: "--font-mono",
  display: "swap",
  src: [
    {
      path: "./fonts/ibm-plex-mono-400.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/ibm-plex-mono-500.ttf",
      weight: "500",
      style: "normal",
    },
  ],
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
  itunes: {
    appId: "6761293350",
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
      var mode = localStorage.getItem("site-theme-mode");
      var allowed = ["book", "codex", "absolutely", "devil", "night"];
      var allowedModes = ["auto", "manual"];
      var resolvedMode = allowedModes.includes(mode)
        ? mode
        : allowed.includes(theme)
          ? "manual"
          : "auto";
      var resolvedTheme = resolvedMode === "auto"
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "book")
        : allowed.includes(theme)
          ? theme
          : "book";
      document.documentElement.setAttribute(
        "data-theme",
        resolvedTheme
      );
      document.documentElement.setAttribute("data-theme-mode", resolvedMode);
    } catch (error) {
      document.documentElement.setAttribute("data-theme", "book");
      document.documentElement.setAttribute("data-theme-mode", "auto");
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
          <MobileShellController>
            <div className="site-chrome min-h-full">
              <SiteHeader />
              <MobileAppBar />
              <main className="app-shell-main flex-1">{children}</main>
              <SiteFooter />
              <MobileBottomNav />
            </div>
          </MobileShellController>
        </ThemeProvider>
      </body>
    </html>
  );
}
