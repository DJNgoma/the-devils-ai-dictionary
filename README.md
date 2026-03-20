# The Devil's AI Dictionary

An editorial, book-like Next.js site for sharp, plain-English definitions of AI terms, product labels, and hype vocabulary.

The project is deliberately not a SaaS dashboard. It is structured as an online reference book with:

- a homepage and book landing page
- an A-Z dictionary browser
- individual entry pages
- category browsing
- local search with filters
- random entry routing
- featured, recent, and misunderstood term sections
- dark mode
- SEO metadata, Open Graph images, sitemap, and robots support
- a file-based content model that can grow without changing the architecture

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- File-based entry content in `content/entries/*.mdx`
- Frontmatter parsing with `gray-matter`
- Client-side local search with `flexsearch`
- Static generation where possible

## Local development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npm run typecheck
npm run build
npm run build:cf
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Project structure

```text
content/entries/                 Dictionary entries in MDX with frontmatter
docs/content-authoring.md        Editorial and schema guide
src/app/                         App Router pages, metadata routes, OG images
src/components/                  UI components, search explorer, reading layout
src/lib/content.ts               Content parsing, related-term logic, listing helpers
src/lib/site.ts                  Site config, navigation, category definitions
src/lib/metadata.ts              Metadata helpers and canonical URL utilities
```

## Content model

Each entry lives in its own `.mdx` file under `content/entries/` and supports:

- `title`
- `slug`
- `letter`
- `categories`
- `aliases`
- `devilDefinition`
- `plainDefinition`
- `whyExists`
- `misuse`
- `practicalMeaning`
- `example`
- `askNext`
- `related`
- `seeAlso`
- `difficulty`
- `technicalDepth`
- `hypeLevel`
- `isVendorTerm`
- `publishedAt`
- `updatedAt`
- optional `warningLabel`
- optional `vendorReferences`
- optional `note`
- optional `translations`
- optional `diagram`
- optional body copy for short editorial asides

Related terms work in two layers:

1. Manual links from the `related` frontmatter field
2. Automatic fallback based on shared categories, tags, difficulty, and technical depth

Use `seeAlso` when you want the entry page to preserve a human-readable list of adjacent terms, even if some of those terms are not published entries yet.

## Adding a new term

1. Create a new file in `content/entries/`, for example `content/entries/quantisation.mdx`.
2. Copy the field structure from an existing entry.
3. Keep category names exactly aligned with the allowed list in [`src/lib/site.ts`](src/lib/site.ts).
4. Use a unique `slug`.
5. Add manual `related` slugs where useful. The site will fill the gaps automatically if needed.
6. Run:

```bash
npm run lint
npm run typecheck
npm run build
```

For the full editorial and schema guide, see [docs/content-authoring.md](docs/content-authoring.md).

## Search and filters

Search indexes term title, aliases, categories, and body text assembled from the structured fields. The dictionary and search pages support filters for:

- category
- difficulty
- vendor/product term
- hype level
- technical depth

## SEO and metadata

The site includes:

- page-level metadata helpers
- canonical URLs
- Open Graph image routes
- `sitemap.xml`
- `robots.txt`
- `manifest.webmanifest`

Set `NEXT_PUBLIC_SITE_URL` in production so canonical URLs and metadata point to the deployed domain.

## Deployment

### Vercel

This is a standard Next.js App Router project. Import the repo into Vercel and deploy with the default settings.

### Cloudflare

This repo is now wired for Cloudflare Workers using `@opennextjs/cloudflare` and Wrangler.

Install dependencies and preview the Workers build locally:

```bash
npm install
npm run preview:cf
```

Deploy to Cloudflare Workers:

```bash
NEXT_PUBLIC_SITE_URL=https://<your-worker>.<your-subdomain>.workers.dev npm run deploy:cf
```

Files added for the Cloudflare path:

- `wrangler.jsonc`
- `open-next.config.ts`
- `public/_headers`

Notes:

- Keep using `npm run dev` for ordinary local development. Use `npm run preview:cf` when you want to test the Cloudflare runtime specifically.
- `NEXT_PUBLIC_SITE_URL` still matters for canonical URLs, Open Graph metadata, and sitemap output. Set it to the final Workers or custom domain at build time.
- This deploys to Cloudflare Workers, not Vercel. Yes, the Next.js app can live somewhere other than its birthplace. The custody dispute remains philosophical.

## Editorial note

The technical architecture is intentionally modest. The point of the project is editorial clarity: a system simple enough to maintain, with content structured enough to scale.
