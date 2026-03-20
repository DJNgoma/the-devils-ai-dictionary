import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const entriesDirectory = path.join(root, "content", "entries");
const outputDirectory = path.join(root, "src", "generated");
const outputFile = path.join(outputDirectory, "entries.generated.json");

async function buildEntryIndex() {
  const files = (await fs.readdir(entriesDirectory))
    .filter((file) => file.endsWith(".mdx"))
    .sort();

  const entries = await Promise.all(
    files.map(async (filename) => {
      const source = await fs.readFile(path.join(entriesDirectory, filename), "utf8");
      const { data, content } = matter(source);

      return {
        ...data,
        body: content.trim(),
      };
    }),
  );

  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(outputFile, `${JSON.stringify(entries, null, 2)}\n`, "utf8");

  console.log(`Generated ${entries.length} dictionary entries into ${path.relative(root, outputFile)}`);
}

buildEntryIndex().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
