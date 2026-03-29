# Mobile checklists

## Store records

- Create the Google Play app record now with package `com.djngoma.devilsaidictionary`.
- Create the App Store Connect record now with bundle ID `com.djngoma.devilsaidictionary`.
- Keep both identifiers for the later native replacements so upgrades happen in place.

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

## QA before wider testing

- Offline cold launch after install
- Manual physical-device route sweep on native iPhone for Home, Browse, Search, Saved, random entry, and entry detail
- Manual physical-device route sweep inside the Android WebView for Home, Dictionary, Categories, Search, Random, and entry detail
- Bookmark persistence across relaunch
- Theme persistence across relaunch
- Bookmark persistence on Samsung A30s and Pixel 5 after force-close and relaunch
- Theme persistence on Samsung A30s and Pixel 5 after relaunch
- Search responsiveness on Samsung A30s
- Search and random-entry flow on Samsung A30s and Pixel 5
- External link handling
- Orientation and notch-safe layout sanity checks
- Internal test install path
- Open test install path

Notes:
`adb` screenshots and launch checks are reliable, but WebView tap automation is not consistent enough on physical devices to replace manual route and persistence QA.

## Solo-dev defaults

- No analytics in v1
- No accounts in v1
- No remote content sync in v1
- Add crash reporting only if manual QA stops being enough

## Backlog

- Replace the deprecated Next.js `middleware` convention with the current `proxy` convention before the next major framework churn forces it.
- Add a native iOS CI build now that the phone app is real, and a native Android CI job once that project stops being a placeholder.
