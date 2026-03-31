# Mobile checklists

This file is the canonical store, QA, and backlog checklist for the shipped mobile apps. Platform runbooks should link here for sign-off instead of carrying duplicate device checklists.

## Store records

- Create the Google Play app record now with package `com.djngoma.devilsaidictionary`.
- Create the App Store Connect record now with bundle ID `com.djngoma.devilsaidictionary`.
- Keep both identifiers fixed so upgrades happen in place.
- Keep the Apple app as one App Store Connect record for iPhone and iPad, and leave Mac availability enabled for the `Designed for iPad` path.

## Signing and backup

- Create a dedicated upload keystore for Android and store two offline backups.
- Keep `android/keystore.properties` out of git.
- Document where the keystore, passwords, and recovery notes live.
- Do the same for Apple signing assets and App Store Connect access.

## Store metadata

- Android screenshots for phone portrait
- iPhone screenshots for the native Apple app
- iPad screenshots for the native Apple app
- Android feature graphic
- short description
- full description
- privacy policy URL
- support contact details

## QA before wider testing

- Offline cold launch after install
- Manual physical-device route sweep on native iPhone for Home, Browse, Search, Saved, random entry, and entry detail
- Manual physical-device route sweep on iPad portrait and landscape for Home, Browse, Search, Saved, random entry, and entry detail
- Manual Apple silicon Mac route sweep via `Designed for iPad` for Home, Browse, Search, Saved, random entry, and entry detail
- Manual physical-device route sweep on native Android for Home, Browse, Search, Saved, random entry, and entry detail on both Samsung 3-button nav and Pixel gesture nav
- Bookmark persistence across relaunch
- Theme persistence across relaunch
- Bookmark persistence on Samsung A30s and Pixel 5 after force-close and relaunch
- Theme persistence on Samsung A30s and Pixel 5 after relaunch
- Search responsiveness on Samsung A30s
- Search and random-entry flow on Samsung A30s and Pixel 5
- External link handling
- Entry deep-link and open-entry handling from Safari on iPhone and iPad
- Native share-sheet sanity checks on iPhone, iPad, and Mac
- Orientation and notch-safe layout sanity checks
- Large-screen content width and no-phone-copy sanity checks on iPad and Mac
- Internal test install path
- Open test install path

## Current status

- Android route sweeps are complete on Galaxy A30, Galaxy A30s, and Pixel 5 for dock visibility, `Home`, `Browse`, `Search`, `Saved`, deep-link entry launch, and the `Entry Detail -> Browse -> Home` back chain.
- Android still needs offline cold-launch checks on A30s and Pixel 5, bookmark and theme persistence rechecks on A30s and Pixel 5, external-link handling, and a final random-entry and search-responsiveness pass before wider release.
- Apple-side manual QA is still open for iPhone, iPad portrait and landscape, Apple silicon Mac via `Designed for iPad`, Safari entry deep links, native share-sheet checks, orientation safety, and larger-screen reading polish.

Notes:
`adb` screenshots and launch checks are reliable, so keep native route and persistence QA manual on physical devices.

## Solo-dev defaults

- Cloudflare Web Analytics only in v1
- No accounts in v1
- No remote content sync in v1
- Add crash reporting only if manual QA stops being enough

## Backlog

- Replace the deprecated Next.js `middleware` convention with the current `proxy` convention before the next major framework churn forces it.
- Keep the native iOS CI build healthy, and add a native Android CI job for the `android/` module.
- Add Android Compose UI coverage for the dock, deep-link entry launch, and the `Entry Detail -> Browse -> Home` back chain.
- Add Android HTTPS app links with `assetlinks.json` and host intent filters after the current Android pass settles.
- Add Android-native share actions for dictionary entries and the daily-word surface.
- Add a native tvOS target with a focus-engine-first reading and browse flow.
- Plan tvOS metadata, screenshots, and App Store Connect release handling separately from the iPhone and iPad app record.
- Run Apple Vision Pro compatibility QA against the existing `Designed for iPad` build before deciding on a native visionOS target.
- Design a native visionOS target only after iPad and Mac TestFlight feedback settles the Apple larger-screen reading model.
