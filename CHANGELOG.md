# Changelog

## Unreleased

### Web auth and deploy guards

- Guard the Cloudflare production deploy against missing Apple web auth secrets so `APPLE_SESSION_SECRET`, `APPLE_WEB_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY` fail in CI before the site falls over at runtime.

### Content and catalogue

- Added six new marketplace-adjacent entries, including Paper, CircleCI, CodeRabbit, Ranked AI, Scite, and Cube, while replacing placeholder Canva and Figma pages with proper entries and raising the dictionary from 718 to 724 terms.

## 1.0.5

### Saved words, sync, and settings

- Saved words now behave like a real collection instead of a single reading-place slot, with Sign in with Apple sync on iPhone and clearer queued, syncing, error, and last-synced feedback.
- Notification settings now expose a real daily-reminder toggle plus per-device delivery-hour control, while native settings add a manual review action and gate the automatic prompt behind actual use.

### Appearance and onboarding

- Appearance now supports Auto mode, which resolves to Book in light mode and Night in dark mode until a manual theme is chosen, and Devil joins the manual theme line-up with clearer swatch contrast.
- First-run onboarding on iPhone was rewritten into a shorter intro with a pinned primary CTA and a cleaner hand-off into the in-app guide.

### Web, release surfaces, and tooling

- Added a dedicated `/settings` page, browser push controls, Sign in with Apple auth routes, saved-word sync routes, and the supporting D1 migrations for the web side of the same release line.
- Shortened the installed app label to `Devil's AI` across Apple and Android so it fits cleanly on device surfaces.
- Added developer-only screenshot presets for stable Apple capture states and restored the missing `esbuild` dependency so `npm ci` and the GitHub Actions release path stay in sync.

## 1.0.4

### Search and cross-references

- Starting a search now clears an active letter filter, and the new Clear Filters action resets the directory in one clean step.
- See Also resolution is more dependable, so linked terms such as DGX now land in the right entry instead of disappearing into a broken trail.

### Catalogue and store assets

- Added `DGX` and `GPU` as proper entries and regenerated the bundled catalogue.
- Finished the `1.0.4` App Store screenshot workspace and revised the store subtitle around real reading flows instead of theme variations.

## 1.0.3

### Content and editorial

- Add the `Clanker` entry to the dictionary and refresh the generated catalogue.

### Home surfaces

- Park the duplicate `Featured` slot on native home surfaces so `Today's word` is the single editorial spotlight for now.
- Document that any future paid placement must be clearly labelled `Sponsored`, with sponsorship enquiries routed to `info@africantechno.com`.

### Mobile reliability

- Fix native Apple deep links so a slug that is still missing after the refresh retry lands in the existing missing-entry state instead of being dropped silently.

### Store listing

- Start the `1.0.3` App Store pass with a tighter subtitle, less wasteful keywords, and a fresh screenshot plan aimed at real reading flows instead of theme variants of the same home screen.

## 1.0.2

### Reading flow and catalogue

- Broaden the glossary, add Categories, and fold Browse and Search into one clearer surface.
- Refresh the Home and Settings screens and bring in a larger run of new entries, including recent AI evasions and figures such as Sundar, Karpathy, Levels, and `bolt.new`.

### Reliability and polish

- Add pull to refresh on Home and smooth out category browsing with fewer awkward taps.
- Strengthen catalogue updates and notification delivery, add an animated splash screen, and tidy a clutch of mobile rough edges so the dictionary feels faster, clearer, and more deliberate.
