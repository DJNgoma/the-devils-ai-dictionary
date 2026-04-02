# Mobile checklists

## Store records

- Create the Google Play app record now with package `com.djngoma.devilsaidictionary`.
- Create the App Store Connect record now with bundle ID `com.djngoma.devilsaidictionary`.
- Keep both identifiers fixed so upgrades happen in place.

## Signing and backup

- Create a dedicated upload keystore for Android and store two offline backups.
- Keep `android/keystore.properties` out of git.
- Document where the keystore, passwords, and recovery notes live.
- Do the same for Apple signing assets and App Store Connect access.

## Store metadata

- Android screenshots for phone portrait
- iPhone screenshots for the native iPhone app
- Android feature graphic
- short description
- full description
- privacy policy URL
- support contact details
- Testing-track copy for internal and open or closed testing release notes

## QA before wider testing

- Offline cold launch after install
- Fresh install with no prior network access: confirm the bundled catalog seeds the app and browsing works offline on first launch
- Manual physical-device route sweep on native iPhone for Home, Browse, Search, Saved, random entry, and entry detail
- Manual physical-device route sweep on native Android for Home, Browse, Search, Saved, random entry, and entry detail
- Foreground refresh after launch: confirm the app stays usable while the OTA catalog check runs and that a newer manifest replaces the cached catalog atomically
- Deep link or pushed slug to a newly added entry: confirm each app retries once against a refreshed catalog before showing a missing-entry state
- iPhone/watch sync after a phone catalog update: confirm the watch receives the refreshed catalog and only accepts matching current-word payloads for the same catalog version
- Upgrade behavior with a newer cached OTA catalog: confirm installing a newer app build does not overwrite a fresher on-device catalog cache with the older bundled seed
- Bookmark persistence across relaunch
- Theme persistence across relaunch
- Bookmark persistence on Samsung A30s and Pixel 5 after force-close and relaunch
- Theme persistence on Samsung A30s and Pixel 5 after relaunch
- Search responsiveness on Samsung A30s
- Search and random-entry flow on Samsung A30s and Pixel 5
- External link handling
- Orientation and notch-safe layout sanity checks
- Internal test install path
- Closed or open test install path, depending on Play account access

Notes:
`adb` screenshots and launch checks are reliable, so keep native route and persistence QA manual on physical devices.

If this Play account is a newly created personal account, plan for the current Google requirement of a closed test with at least 12 opted-in testers for 14 continuous days before production access.

## Solo-dev defaults

- Cloudflare Web Analytics only in v1
- No accounts in v1
- No remote content sync in v1
- Add crash reporting only if manual QA stops being enough

## Backlog

- Replace the deprecated Next.js `middleware` convention with the current `proxy` convention before the next major framework churn forces it.
- Keep the native iOS CI build healthy, and add a native Android CI job for the `android/` module.
- Add Android HTTPS app links with `assetlinks.json` and host intent filters after the current Android pass settles.
- Add Android-native share actions for dictionary entries and the daily-word surface.
