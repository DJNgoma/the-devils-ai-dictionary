import { readFile } from "node:fs/promises";
import path from "node:path";

const FONT_DIR = path.join(process.cwd(), "src/app/fonts");

export type OgFont = {
  name: string;
  data: Buffer;
  weight: 400 | 500 | 600 | 700;
  style: "normal";
};

let cached: Promise<OgFont[]> | null = null;

export function loadOgFonts(): Promise<OgFont[]> {
  if (!cached) {
    cached = (async () => {
      const [display700, body400, body600, body700] = await Promise.all([
        readFile(path.join(FONT_DIR, "fraunces-700.ttf")),
        readFile(path.join(FONT_DIR, "source-serif-4-400.ttf")),
        readFile(path.join(FONT_DIR, "source-serif-4-600.ttf")),
        readFile(path.join(FONT_DIR, "source-serif-4-700.ttf")),
      ]);
      return [
        { name: "Fraunces", data: display700, weight: 700, style: "normal" },
        { name: "Source Serif 4", data: body400, weight: 400, style: "normal" },
        { name: "Source Serif 4", data: body600, weight: 600, style: "normal" },
        { name: "Source Serif 4", data: body700, weight: 700, style: "normal" },
      ];
    })();
  }
  return cached;
}
