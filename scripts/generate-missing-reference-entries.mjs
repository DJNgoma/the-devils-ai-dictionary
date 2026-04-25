import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import {
  collectUnresolvedEntryReferences,
  slugifyReference,
} from "../src/lib/content-build.mjs";

const root = process.cwd();
const entriesDirectory = path.join(root, "content", "entries");
const backlogFile = path.join(root, "docs", "reference-expansion-backlog.json");
const today = "2026-04-25";

const fallbackRelated = ["agent", "model-router", "prompt-architecture"];
const vendorSignals = new Set([
  "ai mode",
  "alibaba cloud",
  "alphafold",
  "anthropic api",
  "anthropic labs",
  "bing",
  "canva",
  "cognition",
  "composer",
  "cosmos",
  "cuda",
  "gmail",
  "google",
  "google ai studio",
  "google labs",
  "google maps",
  "google photos",
  "hp iq",
  "meta",
  "nous research",
]);

function yamlString(value) {
  return JSON.stringify(value);
}

function block(value, indent = "  ") {
  return String(value)
    .trim()
    .split("\n")
    .map((line) => `${indent}${line}`)
    .join("\n");
}

function titleFromLabel(label) {
  if (/[A-Z]/.test(label) || /[/.]/.test(label)) {
    return label.trim();
  }

  return label
    .replace(/-/g, " ")
    .replace(/\b([a-z])/g, (match) => match.toUpperCase())
    .trim();
}

function categoryForLabel(label, sourceEntries, fields) {
  const text = `${label} ${sourceEntries.map((entry) => entry.title).join(" ")}`.toLowerCase();
  const counts = new Map();

  for (const entry of sourceEntries) {
    for (const category of entry.categories ?? []) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }

  const categories = [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([category]) => category)
    .slice(0, 2);

  if (
    fields.includes("vendorReferences") ||
    vendorSignals.has(label.toLowerCase()) ||
    /\b(api|app|cloud|sdk|studio|labs|google|microsoft|openai|claude|gemini|grok|llama|nvidia|vercel|cloudflare)\b/.test(text)
  ) {
    categories.unshift("Product and vendor terms");
  }

  if (/\b(agent|workflow|approval|automation|handoff|delegation|operator|desktop)\b/.test(text)) {
    categories.push("Agents and workflows");
  }

  if (/\b(eval|benchmark|test|red team|safety|security|abuse|guardrail|jailbreak|attack)\b/.test(text)) {
    categories.push("Safety and evaluation");
  }

  if (/\b(gpu|cloud|edge|api|sdk|latency|hosting|compute|server|routing|gateway|cache|inference)\b/.test(text)) {
    categories.push("Infrastructure and deployment");
  }

  if (/\b(data|retrieval|memory|search|context|citation|document)\b/.test(text)) {
    categories.push("Retrieval and memory");
  }

  if (/\b(cost|pricing|budget|margin|procurement|vendor|market|labour|business)\b/.test(text)) {
    categories.push("Economics and operations of AI");
  }

  const unique = [...new Set(categories)].slice(0, 3);
  return unique.length > 0 ? unique : ["Model usage"];
}

function difficultyForLabel(label, fields) {
  const text = label.toLowerCase();

  if (fields.includes("vendorReferences") || /\b(app|cloud|studio|maps|search|gmail|canva)\b/.test(text)) {
    return "beginner";
  }

  if (/\b(trace|optimisation|routing|protocol|inference|architecture|security|governance)\b/.test(text)) {
    return "intermediate";
  }

  return "beginner";
}

function technicalDepthForLabel(label) {
  const text = label.toLowerCase();

  if (/\b(api|sdk|gpu|cuda|routing|latency|cache|token|inference|serving|protocol|schema|eval|benchmark)\b/.test(text)) {
    return "medium";
  }

  if (/\b(society|crisis|founder|theatre|culture|taste|market)\b/.test(text)) {
    return "low";
  }

  return "medium";
}

function tagsFor(label, categories, fields) {
  const tokens = slugifyReference(label)
    .split("-")
    .filter((token) => token.length > 2)
    .slice(0, 3);
  const categoryTags = categories
    .map((category) => slugifyReference(category).split("-")[0])
    .filter(Boolean);
  const fieldTags = fields.map((field) =>
    field === "vendorReferences" ? "vendor" : "relationships",
  );

  return [...new Set([...tokens, ...categoryTags, ...fieldTags])].slice(0, 5);
}

function entryKind(label, fields) {
  const normalized = label.toLowerCase();

  if (fields.includes("vendorReferences") || vendorSignals.has(normalized)) {
    return "vendor";
  }

  if (/\b(policy|governance|risk|security|approval|compliance|safety)\b/.test(normalized)) {
    return "governance";
  }

  if (/\b(api|sdk|gpu|cache|routing|hosting|inference|server|pipeline|workflow|protocol)\b/.test(normalized)) {
    return "technical";
  }

  return "concept";
}

function sentenceContext(sourceEntries) {
  const titles = sourceEntries.map((entry) => entry.title).slice(0, 3);
  if (titles.length === 0) {
    return "the surrounding AI conversation";
  }
  if (titles.length === 1) {
    return titles[0];
  }

  return `${titles.slice(0, -1).join(", ")} and ${titles.at(-1)}`;
}

function proseFor({ title, kind, sourceEntries, fields }) {
  const context = sentenceContext(sourceEntries);
  const referenceKind = fields.includes("vendorReferences")
    ? "vendor or product reference"
    : "adjacent concept";

  if (kind === "vendor") {
    return {
      devilDefinition: `${title} is the kind of ${referenceKind} that turns architecture, procurement, and loyalty into the same conversation.`,
      plainDefinition: `${title} is treated in this dictionary as a named vendor, product, feature, platform, or branded surface that appears in AI product, procurement, or implementation conversations.`,
      whyExists: `The term matters because discussions around ${context} often need to separate the actual technical choice from the brand, distribution channel, contract, or ecosystem wrapped around it.`,
      misuse: `It gets abused when the name is used as a substitute for specifying the exact product surface, model, API, entitlement, pricing constraint, or operational dependency under discussion.`,
      practicalMeaning: `In practice it usually means someone should ask what is being bought, integrated, routed through, depended on, or compared before the logo is allowed to stand in for the architecture.`,
      example: `"${title} came up in the review, which was useful only after the team clarified whether they meant the product, the platform, the model family, or the vendor relationship."`,
      warningLabel: "A brand-shaped noun is not a technical specification.",
      body: `${title} earns its own page because branded nouns often hide decisions about platform control, pricing, permissions, and operational dependency. This entry keeps the name visible without letting it do the architecture's work.`,
    };
  }

  if (kind === "governance") {
    return {
      devilDefinition: `The sober phrase people introduce after the demo has behaved just well enough for everyone to start worrying about what happens next.`,
      plainDefinition: `${title} is a governance, control, or operating concept used to keep AI systems legible, bounded, and answerable once they move beyond isolated demonstrations.`,
      whyExists: `It exists because the problems around ${context} are not only model problems. They are also ownership, permission, review, escalation, and accountability problems.`,
      misuse: `It gets abused when a policy phrase is treated as if saying it creates the control. A label can name the discipline; it cannot perform the discipline for the organisation.`,
      practicalMeaning: `In practice it usually means writing down who can act, who must approve, what gets logged, what can be reversed, and which failures become incidents rather than interesting anecdotes.`,
      example: `"The ${title.toLowerCase()} discussion began as process paperwork and ended as the only reason the agent was allowed anywhere near production."`,
      warningLabel: "Governance vocabulary without enforcement is decorative risk management.",
      body: `${title} belongs here because AI systems become organisational systems as soon as people rely on them. The useful version of the term points to ownership, review, escalation, or enforcement, not merely to a respectable phrase in a slide deck.`,
    };
  }

  if (kind === "technical") {
    return {
      devilDefinition: `A useful technical label that becomes less useful the moment it is dropped into a meeting as proof that the hard part has already been solved.`,
      plainDefinition: `${title} names a technical pattern, component, capability, or implementation concern that affects how AI systems are built, connected, evaluated, or operated.`,
      whyExists: `It exists because conversations around ${context} need sharper language than "the AI bit" when the real issue is interfaces, constraints, failure modes, cost, or system behaviour.`,
      misuse: `It gets abused when the label is treated as a solution rather than a place where engineering still has to make choices, measure trade-offs, and own the consequences.`,
      practicalMeaning: `In practice it usually means checking the boundary conditions: inputs, outputs, latency, permissions, reliability, cost, observability, and whether the chosen abstraction survives real use.`,
      example: `"The team said ${title.toLowerCase()} as though it closed the matter; the postmortem revealed it was where the matter had been hiding."`,
      warningLabel: "Technical vocabulary is not implementation evidence.",
      body: `${title} belongs in the dictionary because implementation detail changes the product conversation. The useful question is not whether the term sounds modern, but what constraint, cost, interface, or failure mode it names.`,
    };
  }

  return {
    devilDefinition: `A phrase that sounds self-explanatory until someone asks it to survive a budget meeting, a product review, or a mildly hostile question.`,
    plainDefinition: `${title} names the nearby AI idea that shows up when ${context} needs a more specific operational handle.`,
    whyExists: `It exists because the main term alone is often too blunt. The surrounding conversation needs a way to name the neighbouring idea without pretending it is the same thing.`,
    misuse: `It gets abused when people use the phrase as a mood, a shortcut, or a status signal instead of explaining the actual mechanism, incentive, or trade-off they mean.`,
    practicalMeaning: `In practice it usually means slowing the conversation down enough to ask whether the label points to a real system property, a commercial incentive, a user behaviour, or just a familiar rhetorical flourish.`,
    example: `"Once ${title.toLowerCase()} entered the discussion, the team finally had a name for the thing everyone had been gesturing at with less precision."`,
    warningLabel: undefined,
    body: `${title} gets its own page because the surrounding discussion around ${context} keeps needing this sharper distinction. Used well, it turns a vague AI-adjacent gesture into a claim someone can test, budget for, or push back on.`,
  };
}

function buildEntry({ label, slug, fields, sourceEntries, index }) {
  const title = titleFromLabel(label);
  const categories = categoryForLabel(label, sourceEntries, fields);
  const kind = entryKind(label, fields);
  const prose = proseFor({ title, kind, sourceEntries, fields });
  const related = sourceEntries.map((entry) => entry.slug).filter(Boolean).slice(0, 3);
  const relatedSlugs = related.length > 0 ? related : fallbackRelated;
  const seeAlso = sourceEntries.map((entry) => entry.title).filter(Boolean).slice(0, 3);
  const aliases = title === label ? [] : [label];
  const misunderstoodScore = fields.includes("vendorReferences") ? 3 : 4;
  const hypeLevel = kind === "vendor" || kind === "concept" ? "medium" : "low";
  const firstLetter = title.match(/[A-Za-z]/)?.[0]?.toUpperCase() ?? "X";
  const tags = tagsFor(label, categories, fields);
  const translationLabel =
    kind === "vendor" ? "procurement meaning" :
      kind === "technical" ? "engineer meaning" :
        kind === "governance" ? "operator meaning" :
          "what it usually means in reality";
  const translationText =
    kind === "vendor"
      ? "Treat the name as a dependency to inspect, not a badge to admire."
      : kind === "technical"
        ? "A concrete implementation concern wearing a compact label."
        : kind === "governance"
          ? "The part where permission, accountability, and review have to become real."
          : "A useful nearby term, provided someone explains the mechanism instead of using it as scenery.";

  return {
    filename: `${slug}.mdx`,
    source: `---\n` +
      `title: ${yamlString(title)}\n` +
      `slug: ${yamlString(slug)}\n` +
      `letter: ${yamlString(firstLetter)}\n` +
      `categories:\n${categories.map((category) => `  - ${yamlString(category)}`).join("\n")}\n` +
      `aliases:${aliases.length > 0 ? `\n${aliases.map((alias) => `  - ${yamlString(alias)}`).join("\n")}` : " []"}\n` +
      `devilDefinition: |\n${block(prose.devilDefinition)}\n` +
      `plainDefinition: |\n${block(prose.plainDefinition)}\n` +
      `whyExists: |\n${block(prose.whyExists)}\n` +
      `misuse: |\n${block(prose.misuse)}\n` +
      `practicalMeaning: |\n${block(prose.practicalMeaning)}\n` +
      `example: |\n${block(prose.example)}\n` +
      `askNext:\n` +
      `  - ${yamlString(`What exact meaning of ${title} is being used here?`)}\n` +
      `  - ${yamlString("What changes operationally if this label is removed from the sentence?")}\n` +
      `  - ${yamlString("Is this naming a mechanism, a vendor choice, a risk, or a wish?")}\n` +
      `related:\n${relatedSlugs.map((relatedSlug) => `  - ${yamlString(relatedSlug)}`).join("\n")}\n` +
      `seeAlso:${seeAlso.length > 0 ? `\n${seeAlso.map((item) => `  - ${yamlString(item)}`).join("\n")}` : " []"}\n` +
      `difficulty: ${yamlString(difficultyForLabel(label, fields))}\n` +
      `technicalDepth: ${yamlString(technicalDepthForLabel(label))}\n` +
      `hypeLevel: ${yamlString(hypeLevel)}\n` +
      `isVendorTerm: ${kind === "vendor" ? "true" : "false"}\n` +
      `publishedAt: ${yamlString(today)}\n` +
      `updatedAt: ${yamlString(today)}\n` +
      `${prose.warningLabel ? `warningLabel: ${yamlString(prose.warningLabel)}\n` : ""}` +
      `vendorReferences: []\n` +
      `tags:\n${tags.map((tag) => `  - ${yamlString(tag)}`).join("\n")}\n` +
      `misunderstoodScore: ${misunderstoodScore}\n` +
      `translations:\n` +
      `  - label: ${yamlString(translationLabel)}\n` +
      `    text: ${yamlString(translationText)}\n` +
      `---\n\n` +
      `${prose.body}\n`,
    backlog: {
      batch: Math.floor(index / 35) + 1,
      label,
      slug,
      fields,
      sourceSlugs: sourceEntries.map((entry) => entry.slug),
      categories,
      status: "created",
    },
  };
}

async function loadEntries() {
  const files = (await fs.readdir(entriesDirectory))
    .filter((file) => file.endsWith(".mdx"))
    .sort();

  return Promise.all(
    files.map(async (filename) => {
      const source = await fs.readFile(path.join(entriesDirectory, filename), "utf8");
      const { data } = matter(source);
      return {
        ...data,
        aliases: data.aliases ?? [],
        related: data.related ?? [],
        seeAlso: data.seeAlso ?? [],
        vendorReferences: data.vendorReferences ?? [],
        tags: data.tags ?? [],
        translations: data.translations ?? [],
        body: "",
        filename,
      };
    }),
  );
}

async function main() {
  const entries = await loadEntries();
  const entryBySlug = new Map(entries.map((entry) => [entry.slug, entry]));
  const missingBySlug = new Map();

  for (const item of collectUnresolvedEntryReferences(entries)) {
    const current = missingBySlug.get(item.slug) ?? {
      label: item.label,
      slug: item.slug,
      fields: new Set(),
      sourceSlugs: new Set(),
      count: 0,
    };

    current.fields.add(item.field);
    current.sourceSlugs.add(item.entrySlug);
    current.count += 1;
    missingBySlug.set(item.slug, current);
  }

  const missing = [...missingBySlug.values()]
    .filter((item) => item.slug && !entryBySlug.has(item.slug))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label);
    });

  const generated = missing.map((item, index) =>
    buildEntry({
      label: item.label,
      slug: item.slug,
      fields: [...item.fields].sort(),
      sourceEntries: [...item.sourceSlugs].map((slug) => entryBySlug.get(slug)).filter(Boolean),
      index,
    }),
  );

  await fs.mkdir(path.dirname(backlogFile), { recursive: true });
  await fs.writeFile(
    backlogFile,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourceEntryCount: entries.length,
        createdEntryCount: generated.length,
        batchSize: 35,
        items: generated.map((entry) => entry.backlog),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  await Promise.all(
    generated.map((entry) =>
      fs.writeFile(path.join(entriesDirectory, entry.filename), entry.source, {
        encoding: "utf8",
        flag: "wx",
      }),
    ),
  );

  console.log(`Created ${generated.length} missing reference entries.`);
  console.log(`Wrote ${path.relative(root, backlogFile)}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
