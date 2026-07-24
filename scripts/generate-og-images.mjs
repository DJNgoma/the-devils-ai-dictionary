import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const catalogPath = path.join(root, "src", "generated", "entries.generated.json");
const outputDir = path.join(root, "public", "og-images");
const width = 1200;
const height = 630;

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function truncate(value, limit) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`;
}

function wrap(value, maxColumns, maxLines) {
  const words = truncate(value, maxColumns * maxLines).split(" ").filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxColumns || current.length === 0) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  const consumed = lines.join(" ").length;
  const source = words.join(" ");
  if (source.length > consumed && lines.length > 0) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.,;:]?$/, "")}…`;
  }
  return lines;
}

function textLines(lines, { x, y, size, lineHeight, weight = 400, family = "Arial" }) {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="#240d07">${escapeXml(line)}</text>`,
    )
    .join("");
}

function frame(content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ff5b2c"/><stop offset="0.42" stop-color="#ff6233"/><stop offset="1" stop-color="#ff6d2c"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.14" cy="0.18" r="0.72"><stop offset="0" stop-color="#ffc7a8" stop-opacity="0.26"/><stop offset="1" stop-color="#ff5b2c" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect width="1200" height="630" fill="url(#glow)"/>
    <rect x="34" y="34" width="1132" height="562" fill="none" stroke="#210a04" stroke-opacity="0.22"/>
    ${content}
  </svg>`;
}

function homeSvg() {
  return frame(`
    <text x="88" y="112" font-family="Arial" font-size="18" letter-spacing="7" fill="#240d07" fill-opacity="0.76">ONLINE BOOK</text>
    <text x="88" y="205" font-family="Georgia" font-size="68" font-weight="700" letter-spacing="4" fill="#491108" fill-opacity="0.34">THE DEVIL&apos;S</text>
    <line x1="88" y1="235" x2="780" y2="235" stroke="#3c0f07" stroke-opacity="0.28"/>
    <text x="88" y="320" font-family="Georgia" font-size="74" font-weight="700" letter-spacing="4" fill="#491108" fill-opacity="0.34">AI DICTIONARY</text>
    <text x="92" y="448" font-family="Georgia" font-size="46" font-weight="700" fill="#240d07">A sceptical field guide</text>
    <text x="92" y="500" font-family="Arial" font-size="22" fill="#240d07" fill-opacity="0.82">The language machines, marketers, founders, and consultants use</text>
    <text x="92" y="534" font-family="Arial" font-size="22" fill="#240d07" fill-opacity="0.82">when they want to sound smarter than they are.</text>
    <rect x="910" y="186" width="190" height="300" rx="30" fill="#170d08" fill-opacity="0.08" stroke="#160804" stroke-opacity="0.18"/>
    <text x="1005" y="370" text-anchor="middle" font-family="Georgia" font-size="118" font-weight="700" fill="#170d08">D</text>
  `);
}

function iconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5b2c"/><stop offset="1" stop-color="#ff6a31"/></linearGradient></defs>
    <rect width="512" height="512" fill="url(#bg)"/><rect x="28" y="28" width="456" height="456" fill="none" stroke="#220c06" stroke-opacity="0.3"/>
    <rect x="104" y="104" width="304" height="304" rx="84" fill="#1a0a06" fill-opacity="0.09"/>
    <text x="256" y="334" text-anchor="middle" font-family="Georgia" font-size="230" font-weight="700" fill="#140904">D</text>
  </svg>`;
}

function entrySvg(entry) {
  const title = wrap(entry.title, 26, 2);
  const definition = wrap(entry.devilDefinition || entry.plainDefinition, 58, 3);
  const letter = truncate(entry.letter || entry.title?.[0] || "D", 1).toUpperCase();

  return frame(`
    <rect x="88" y="82" width="56" height="56" rx="16" fill="none" stroke="#200904" stroke-opacity="0.32" stroke-width="2"/>
    <text x="116" y="121" text-anchor="middle" font-family="Georgia" font-size="28" font-weight="700" fill="#1a0904">${escapeXml(letter)}</text>
    <text x="166" y="117" font-family="Arial" font-size="17" letter-spacing="5" fill="#240d07" fill-opacity="0.7">THE DEVIL&apos;S AI DICTIONARY</text>
    ${textLines(title, { x: 88, y: 228, size: 62, lineHeight: 70, weight: 700, family: "Georgia" })}
    <line x1="88" y1="390" x2="790" y2="390" stroke="#240d07" stroke-opacity="0.3" stroke-width="2"/>
    ${textLines(definition, { x: 88, y: 440, size: 26, lineHeight: 36, family: "Arial" })}
    <rect x="936" y="126" width="180" height="356" rx="30" fill="#170d08" fill-opacity="0.08" stroke="#160804" stroke-opacity="0.18"/>
    <text x="1026" y="354" text-anchor="middle" font-family="Georgia" font-size="150" font-weight="700" fill="#170d08">${escapeXml(letter)}</text>
  `);
}

async function render(svg, destination, dimensions = { width, height }) {
  await sharp(Buffer.from(svg))
    .resize(dimensions.width, dimensions.height)
    .png({ compressionLevel: 9, palette: true, quality: 92 })
    .toFile(destination);
}

async function mapWithConcurrency(items, limit, callback) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        await callback(items[index]);
      }
    }),
  );
}

const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));
const entries = Array.isArray(catalog.entries) ? catalog.entries : [];

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });
sharp.concurrency(Math.max(1, Math.min(os.availableParallelism(), 8)));

await Promise.all([
  render(homeSvg(), path.join(outputDir, "home.png")),
  render(iconSvg(), path.join(outputDir, "icon.png"), { width: 512, height: 512 }),
]);
await mapWithConcurrency(entries, 8, (entry) =>
  render(entrySvg(entry), path.join(outputDir, `${entry.slug}.png`)),
);

console.log(`Generated ${entries.length + 2} static Open Graph images in public/og-images.`);
