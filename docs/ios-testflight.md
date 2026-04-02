# Apple app and TestFlight

This repo now ships the Apple app as a native SwiftUI client inside `ios/App/TheDevilsAIDictionary`. The Xcode project bundle is `ios/App/The Devil's AI Dictionary.xcodeproj`, and the main app target and scheme are both named `The Devil's AI Dictionary`. The app reads the bundled `src/generated/entries.generated.json` snapshot directly, so it does not depend on a production webview URL or a synced `out/` directory at runtime.

## App Store Connect shape

Keep exactly one live App Store Connect app record for this product: `The Devil's AI Dictionary` with bundle ID `com.djngoma.devilsaidictionary`.

- The watch target is an embedded watch companion inside the iPhone app archive, not a separate store app to manage on its own.
- Do not create or maintain a separate App Store Connect app record for `com.djngoma.devilsaidictionary.watchkitapp`.
- The current iPhone/iPad target can also be distributed on Apple silicon Macs and Apple Vision Pro as a compatible iPhone/iPad app when those availability switches stay enabled in App Store Connect.
- The Xcode project now also contains native macOS and native visionOS targets. Keep those platforms under the existing `The Devil's AI Dictionary` app record so the Apple product stays one record rather than a pile of siblings.

## First-time setup

1. Install JavaScript dependencies:

   ```bash
   npm install
   ```

2. Generate icons and splash assets from `assets/logo.svg`:

   ```bash
   npm run apple:assets
   ```

## Repeatable update flow

When content or app code changes and you want a fresh iOS build:

```bash
npm run ios:prepare
```

That command:

- regenerates the bundled content snapshot
- refreshes icons and splash assets for the native target

The Apple asset helper now lives at `npm run apple:assets`. It still uses `@capacitor/assets` for the primary iPhone/iPad icon and splash generation, then fans the generated icon out to the Apple asset catalogs it finds in `ios/App`, including the watch, macOS, and visionOS targets. The legacy `npm run ios:assets` name remains as an alias.

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
npm run macos:build
npm run visionos:build:sim
```

For a signed Debug build to a connected local iPhone or iPad:

```bash
npm run ios:build:local-device
IOS_DEVICE_NAME="Daliso's iPhone Air" npm run ios:build:local-device
IOS_DEVICE_ID=00008150-001465E901C0401C npm run ios:run:local-device
```

- `ios:build:local-device` prepares the content snapshot, resolves one connected iOS device automatically when there is exactly one available target, and runs a signed Debug build with provisioning updates enabled.
- `ios:run:local-device` does the same build, then installs and launches the app on that device with `devicectl`.
- If more than one device is available, set `IOS_DEVICE_ID` or `IOS_DEVICE_NAME` explicitly.
- Override `IOS_DERIVED_DATA_PATH` if you want the local-device build products somewhere other than `tmp/ios-local-device-build`.

For manual one-off builds, route `xcodebuild` through the helper so you stay on Xcode 26.4 by default:

```bash
node scripts/with-xcode.mjs xcodebuild -project "ios/App/The Devil's AI Dictionary.xcodeproj" -scheme "The Devil's AI Dictionary" -configuration Debug -destination 'platform=iOS Simulator,name=iPad Air 11-inch (M4)' CODE_SIGNING_ALLOWED=NO build
node scripts/with-xcode.mjs xcodebuild -project "ios/App/The Devil's AI Dictionary.xcodeproj" -scheme "The Devil's AI Dictionary" -configuration Debug -destination 'id=<MY_MAC_DESTINATION_ID>' CODE_SIGNING_ALLOWED=NO build
DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer node scripts/with-xcode.mjs xcodebuild -project "ios/App/The Devil's AI Dictionary.xcodeproj" -scheme "The Devil's AI Dictionary" -configuration Debug -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

Use `npm run ios:destinations` to confirm the current iPad simulator name and to copy the `My Mac` destination ID for the `Designed for iPad` build.

Use [`docs/mobile/checklists.md`](./mobile/checklists.md) for the shared device QA matrix. This file stays focused on the Apple build, archive, and upload path.
Use [`docs/mobile/apple-ship-checklist.md`](./mobile/apple-ship-checklist.md) when you need a one-page Apple ship / no-ship gate for TestFlight.

## Current TestFlight Focus

For the OTA-catalog build, ask testers to focus on these Apple-specific checks:

- Fresh TestFlight install on iPhone with networking disabled after first launch to confirm the bundled catalog seeds the app and still boots offline.
- Foreground refresh on iPhone to confirm the app stays usable while the OTA catalog check runs and the cached catalog is replaced atomically.
- Deep-link or pushed-slug handling for a newly added entry so the app refreshes once and resolves the slug instead of failing immediately.
- Paired watch sync after the phone refreshes its catalog so the watch receives the updated snapshot and current-word state without showing a stale entry.
- Temporary phone/watch version drift: if the watch has not received the new catalog yet, it should refuse mismatched current-word payloads rather than showing the wrong word.
- Upgrade from an older TestFlight build when the device already has a newer OTA catalog cache: confirm the app keeps the fresher cache instead of reverting to the bundled seed from the new build.

## Xcode checklist before TestFlight

Inside Xcode:

1. Open the `The Devil's AI Dictionary` target in `ios/App`.
2. Set your Apple Developer Team in `Signing & Capabilities`.
3. Confirm the bundle identifier. This repo uses `com.djngoma.devilsaidictionary` by default.
4. Confirm the marketing version and build number in the target settings. The checked-in source of truth is `package.json` plus `app-version.json`, not ad hoc edits in Xcode.
5. Run one local build on an iPhone simulator.
6. Run one local build on an iPad simulator.
7. Run one local build on `My Mac` as `Designed for iPad`.
8. Run one local build on the native macOS target if that platform is part of the release.
9. Run one local build on the visionOS simulator target if that platform is part of the release.
10. For the iPhone/iPad archive, switch the destination to `Any iOS Device (arm64)` or a connected iPhone/iPad.
11. Archive the app with `Product` -> `Archive`.
12. In the Organizer, choose `Distribute App` -> `App Store Connect` -> `Upload`.

## Repeatable CLI upload notes

- Keep using `/Applications/Xcode.app` (Xcode 26.4) for release archives unless you are explicitly validating against a newer beta toolchain.
- The watch companion target must remain embedded-only for release archives. In practice that means the project must keep `The Devil's AI Dictionary Watch` as `SKIP_INSTALL = YES` with an `AppIcon` asset configured, otherwise App Store Connect will reject the archive shape or icon metadata.
- Internal TestFlight distribution is automatic for the existing internal `TestFlight` group because it has access to all builds. External/public-link testing still requires the usual Beta App Review flow.
- If App Store Connect leaves a fresh build in `MISSING_EXPORT_COMPLIANCE`, set `usesNonExemptEncryption=false` for this app before expecting internal testers to see it.

## Security boundary

- Commit project metadata fixes like archive settings, icon configuration, and plist metadata.
- Do not commit App Store Connect API keys, `.p8` files, provisioning profiles, exported `.ipa` files, temporary keychains, or local export plists with signing material. Keep those in ignored local paths such as `.asc/` or the macOS keychain.
- Prefer short-lived temporary keychains for distribution certificates if you need CLI signing on a shared machine. Reset or delete them after the upload if they are no longer needed.

## Notes

- The remaining gate for an actual TestFlight upload is Apple signing and App Store Connect metadata, not a web bundle sync.
- Use `docs/mobile/checklists.md` for the shared store, signing, and wider-device QA checklist. Keep this file focused on the Apple build and TestFlight upload flow.
- Keep one App Store Connect record for the Apple product. The main iPhone app uses `com.djngoma.devilsaidictionary`; the watch companion stays embedded in that archive with its own watch bundle ID. Do not create separate Apple app records for the watch, macOS, or visionOS variants.
- The current Xcode project ships an iPhone/iPad app, the embedded watch companion, and native macOS plus native visionOS targets.
- Keep Apple silicon Mac and Apple Vision Pro compatibility enabled for the iOS app unless you intentionally want an iPhone/iPad-only release. Native macOS and native visionOS releases should still live under the same Apple record.
- `src/generated/entries.generated.json` is copied directly into the app target, so `npm run content:build` is the iOS content prerequisite.
- The shared versioning rule lives in [`docs/release-versioning.md`](./release-versioning.md).
- The ordinary website deploy remains the Cloudflare path documented in the main README.
