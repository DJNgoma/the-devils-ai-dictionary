# Changelog

## Unreleased

- Added a developer-only ASO screenshot preset mode on iOS so simulator launches can stage clean `Home`, `Search`, `Categories`, `Saved`, and `Entry` capture states without shipping that harness in production behaviour.
- Shortened the installed app label to `Devil's AI` across Apple and Android targets so the name fits cleanly on device surfaces instead of truncating.
- Added an explicit `esbuild` tool dependency and refreshed the release plumbing so `npm ci` succeeds again under the npm 10 runner used by GitHub Actions.

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
