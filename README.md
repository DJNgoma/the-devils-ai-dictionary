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
- Capacitor shells for iOS and Android distribution
- File-based entry content in `content/entries/*.mdx`
- Generated content index for runtime-safe entry loading
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
npm run build:mobile
npm run android:build:debug
npm run swift-core:test
npm run build:cf
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Repository conventions

- Commit subjects should follow the dry, book-aware house style documented in [docs/commit-message-style.md](docs/commit-message-style.md).

## Public repo

- GitHub: [DJNgoma/the-devils-ai-dictionary](https://github.com/DJNgoma/the-devils-ai-dictionary)
- License: [MIT](LICENSE)
- Contributions: see [CONTRIBUTING.md](CONTRIBUTING.md) for terms-only pull requests and term suggestions

## Mobile apps

- The repo can produce bundled iOS and Android apps via Capacitor from the same static export.
- iOS distribution notes: [docs/ios-testflight.md](docs/ios-testflight.md)
- Android setup, release, and Play testing notes: [docs/mobile/android-capacitor.md](docs/mobile/android-capacitor.md)
- Native follow-on roadmap and shared Swift boundary: [docs/mobile/native-roadmap.md](docs/mobile/native-roadmap.md)
- Solo-dev release and QA checklists: [docs/mobile/checklists.md](docs/mobile/checklists.md)

### Tested devices

- Android Emulator, API 35, arm64
- Samsung Galaxy A30s (`SM-A307FN`), Android 11 / API 30, Android System WebView 87.0.4280.141
- Google Pixel 5, Android 13 / API 33, Android System WebView 103.0.5060.71

## Project structure

```text
content/entries/                 Dictionary entries in MDX with frontmatter
docs/commit-message-style.md     Commit-subject tone guide and history audit
docs/content-authoring.md        Editorial and schema guide
docs/mobile/                     Mobile runbooks, release guides, and checklists
native/                          Future native iOS and Android app homes
shared/swift-core/               Shared Swift package for read-only domain logic
src/app/                         App Router pages, metadata routes, OG images
src/components/                  UI components, search explorer, reading layout
scripts/generate-content-index.mjs
                                 Builds the generated entry index from MDX
src/generated/entries.generated.json
                                 Generated content manifest consumed at runtime
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

`npm run dev` and `npm run build` both regenerate the content index automatically before Next starts.

For the full editorial and schema guide, see [docs/content-authoring.md](docs/content-authoring.md).

## Search and filters

Search indexes term title, aliases, categories, and body text assembled from the structured fields. The dictionary and search pages support filters for:

- category
- difficulty
- vendor/product term
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

Production hostnames:

- Primary: `https://thedevilsaidictionary.com`
- Redirect: `https://www.thedevilsaidictionary.com` -> `https://thedevilsaidictionary.com`

Install dependencies and preview the Workers build locally:

```bash
npm install
npm run preview:cf
```

Deploy to Cloudflare Workers:

```bash
npm run deploy:cf
```

Files added for the Cloudflare path:

- `wrangler.jsonc`
- `open-next.config.ts`
- `src/middleware.ts`
- `public/_headers`

Notes:

- Keep using `npm run dev` for ordinary local development. Use `npm run preview:cf` when you want to test the Cloudflare runtime specifically.
- The app no longer relies on runtime filesystem reads for dictionary content. Entries are compiled into `src/generated/entries.generated.json` during `npm run dev` and `npm run build`, which is much less sentimental and considerably more compatible with Workers.
- `wrangler.jsonc` now pins `NEXT_PUBLIC_SITE_URL` to `https://thedevilsaidictionary.com` so canonical URLs, Open Graph metadata, and sitemap output stay on the apex domain during Workers deploys.
- `wrangler.jsonc` publishes the Worker to the existing Cloudflare zone routes `thedevilsaidictionary.com/*` and `www.thedevilsaidictionary.com/*` instead of using Worker Custom Domains. This avoids collisions with existing DNS records in the zone.
- `src/middleware.ts` permanently redirects the `www` hostname to the apex domain while preserving path and query string. The repo keeps the Edge middleware file because the current OpenNext Cloudflare adapter does not support the Node runtime `proxy.ts` path yet.
- This deploys to Cloudflare Workers, not Vercel. Yes, the Next.js app can live somewhere other than its birthplace. The custody dispute remains philosophical.

### Domain linking checklist

1. Ensure `thedevilsaidictionary.com` is delegated to the Cloudflare account that owns the Worker deployment.
2. Keep both `thedevilsaidictionary.com` and `www.thedevilsaidictionary.com` as proxied DNS records inside that zone.
3. Deploy the Worker. The repo already declares both route bindings in `wrangler.jsonc`.
4. Confirm the apex domain serves the site and that `www` redirects to the apex.

## Editorial note

The technical architecture is intentionally modest. The point of the project is editorial clarity: a system simple enough to maintain, with content structured enough to scale.
