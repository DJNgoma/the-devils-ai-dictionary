# Apple app and TestFlight

This repo now ships the Apple app as a native SwiftUI client inside `ios/App/App`. The Xcode project bundle is `ios/App/The Devil's AI Dictionary.xcodeproj`, and the main app target and scheme are both named `The Devil's AI Dictionary`. The app reads the bundled `src/generated/entries.generated.json` snapshot directly, so it does not depend on a production webview URL or a synced `out/` directory at runtime.

## First-time setup

1. Install JavaScript dependencies:

   ```bash
   npm install
   ```

2. Generate icons and splash assets from `assets/logo.svg`:

   ```bash
   npm run ios:assets
   ```

## Repeatable update flow

When content or app code changes and you want a fresh iOS build:

```bash
npm run ios:prepare
```

That command:

- regenerates the bundled content snapshot
- refreshes icons and splash assets for the native target

Then open Xcode:

```bash
npm run ios:open
```

The supported local Apple toolchain is `/Applications/Xcode.app` (Xcode 26.4). This repo now routes CLI Apple builds through `scripts/with-xcode.mjs`, which prefers the stable Xcode app even when `xcode-select` is still pointed at `Xcode-beta.app`. If you intentionally want the beta toolchain, set `DEVELOPER_DIR` explicitly for that one command.

Version settings are now repo-driven:

- `MARKETING_VERSION` is synced from `package.json` `version`
- `CURRENT_PROJECT_VERSION` is synced from `app-version.json` `buildNumber`

Run `npm run version:sync` if you changed either file and want Xcode to reflect it immediately.

## Local verification before TestFlight

Use these commands before opening Xcode if you want a repeatable local gate:

```bash
npm run swift-core:test
npm run ios:destinations
npm run ios:build:sim
npm run watch:build:sim
```

For manual one-off builds, route `xcodebuild` through the helper so you stay on Xcode 26.4 by default:

```bash
node scripts/with-xcode.mjs xcodebuild -project "ios/App/The Devil's AI Dictionary.xcodeproj" -scheme "The Devil's AI Dictionary" -configuration Debug -destination 'platform=iOS Simulator,name=iPad Air 11-inch (M4)' CODE_SIGNING_ALLOWED=NO build
node scripts/with-xcode.mjs xcodebuild -project "ios/App/The Devil's AI Dictionary.xcodeproj" -scheme "The Devil's AI Dictionary" -configuration Debug -destination 'id=<MY_MAC_DESTINATION_ID>' CODE_SIGNING_ALLOWED=NO build
DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer node scripts/with-xcode.mjs xcodebuild -project "ios/App/The Devil's AI Dictionary.xcodeproj" -scheme "The Devil's AI Dictionary" -configuration Debug -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

Use `npm run ios:destinations` to confirm the current iPad simulator name and to copy the `My Mac` destination ID for the `Designed for iPad` build.

Use [`docs/mobile/checklists.md`](./mobile/checklists.md) for the shared device QA matrix. This file stays focused on the Apple build, archive, and upload path.

## Xcode checklist before TestFlight

Inside Xcode:

1. Open the `The Devil's AI Dictionary` target in `ios/App`.
2. Set your Apple Developer Team in `Signing & Capabilities`.
3. Confirm the bundle identifier. This repo uses `com.djngoma.devilsaidictionary` by default.
4. Confirm the marketing version and build number in the target settings. The checked-in source of truth is `package.json` plus `app-version.json`, not ad hoc edits in Xcode.
5. Run one local build on an iPhone simulator.
6. Run one local build on an iPad simulator.
7. Run one local build on `My Mac` as `Designed for iPad`.
8. For the archive, switch the destination to `Any iOS Device (arm64)` or a connected iPhone/iPad.
9. Archive the app with `Product` -> `Archive`.
10. In the Organizer, choose `Distribute App` -> `App Store Connect` -> `Upload`.

## Notes

- The remaining gate for an actual TestFlight upload is Apple signing and App Store Connect metadata, not a web bundle sync.
- Use `docs/mobile/checklists.md` for the shared store, signing, and wider-device QA checklist. Keep this file focused on the Apple build and TestFlight upload flow.
- Keep one App Store Connect record and one bundle ID for the Apple app. Do not create a separate Mac app record in this tranche.
- Leave Mac availability enabled for the iOS app so Apple silicon Macs receive the `Designed for iPad` build path.
- `src/generated/entries.generated.json` is copied directly into the app target, so `npm run content:build` is the iOS content prerequisite.
- The shared versioning rule lives in [`docs/release-versioning.md`](./release-versioning.md).
- The ordinary website deploy remains the Cloudflare path documented in the main README.
