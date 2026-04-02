import path from "node:path";
import {
  publishMobileCatalogArtifacts,
} from "../src/lib/mobile-catalog.mjs";

const root = process.cwd();
const snapshotSourceFile = path.join(root, "src", "generated", "entries.generated.json");
const outputDirectory = path.join(root, "public", "mobile-catalog");

async function publishMobileCatalog() {
  const { manifest } = await publishMobileCatalogArtifacts({
    snapshotSourceFile,
    outputDirectory,
  });

  console.log(
    `Published mobile catalog ${manifest.catalogVersion} into ${path.relative(root, outputDirectory)}`,
  );
}

publishMobileCatalog().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
