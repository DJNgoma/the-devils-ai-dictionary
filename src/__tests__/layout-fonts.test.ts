import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const layoutPath = path.resolve(__dirname, "../app/layout.tsx");
const fontsDirectory = path.resolve(__dirname, "../app/fonts");
const layoutSource = fs.readFileSync(layoutPath, "utf8");
const bundledFonts = [
  "fraunces-500.ttf",
  "fraunces-600.ttf",
  "fraunces-700.ttf",
  "ibm-plex-mono-400.ttf",
  "ibm-plex-mono-500.ttf",
  "source-serif-4-400.ttf",
  "source-serif-4-500.ttf",
  "source-serif-4-600.ttf",
  "source-serif-4-700.ttf",
];

describe("root layout font configuration", () => {
  it("uses next/font/local instead of next/font/google", () => {
    expect(layoutSource).toContain('import localFont from "next/font/local"');
    expect(layoutSource).not.toContain('next/font/google');
  });

  it("ships the bundled font files the layout depends on", () => {
    for (const fontFile of bundledFonts) {
      expect(fs.existsSync(path.join(fontsDirectory, fontFile))).toBe(true);
    }
  });

  it("references every bundled font file from the layout", () => {
    for (const fontFile of bundledFonts) {
      expect(layoutSource).toContain(`./fonts/${fontFile}`);
    }
  });
});
