import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const resRoot = new URL("../android/app/src/main/res/", import.meta.url);
const resRootPath = fileURLToPath(resRoot);

const adaptiveIconFiles = [
  new URL("mipmap-anydpi-v26/ic_launcher.xml", resRoot),
  new URL("mipmap-anydpi-v26/ic_launcher_round.xml", resRoot),
];

for (const file of adaptiveIconFiles) {
  const source = readFileSync(file, "utf8");
  const updated = source.replaceAll(
    "@mipmap/ic_launcher_background",
    "@color/ic_launcher_background",
  );

  if (updated !== source) {
    writeFileSync(file, updated);
  }
}

writeFileSync(
  new URL("values/ic_launcher_background.xml", resRoot),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#FF5B2C</color>
</resources>
`,
);

for (const entry of readdirSync(resRoot, { withFileTypes: true })) {
  if (!entry.isDirectory() || !entry.name.startsWith("mipmap-")) {
    continue;
  }

  rmSync(join(resRootPath, entry.name, "ic_launcher_background.png"), {
    force: true,
  });
}
