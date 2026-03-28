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
- iPhone screenshots for the current Capacitor shell
- Android feature graphic
- short description
- full description
- privacy policy URL
- support contact details

## QA before wider testing

- Offline cold launch after install
- Bookmark persistence across relaunch
- Theme persistence across relaunch
- Search responsiveness on Samsung A30s
- External link handling
- Orientation and notch-safe layout sanity checks
- Internal test install path
- Open test install path

## Solo-dev defaults

- No analytics in v1
- No accounts in v1
- No remote content sync in v1
- Add crash reporting only if manual QA stops being enough

## Backlog

- Replace the deprecated Next.js `middleware` convention with the current `proxy` convention before the next major framework churn forces it.
- Add native iOS and native Android CI jobs once those projects move beyond placeholders.
