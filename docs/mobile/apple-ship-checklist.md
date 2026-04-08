# Apple ship / no-ship checklist

Ship only if every box is checked.

## Release readiness

- [ ] `package.json` marketing version and `app-version.json` build number are final, and `npm run version:sync` has been run if needed.
- [ ] The app still builds through the normal local gate: `npm run swift-core:test`, `npm run ios:destinations`, `npm run ios:build:sim`, `npm run watch:build:sim`, `npm run macos:build`, and `npm run visionos:build:sim`.
- [ ] Xcode is using `/Applications/Xcode.app` unless there is an explicit reason to validate on beta.
- [ ] The `The Devil's AI Dictionary` target is signed with the correct team and bundle identifier `com.djngoma.devilsaidictionary`.
- [ ] The archive destination is `Any iOS Device (arm64)` or a connected iPhone/iPad, and the watch target is still embedded-only with `SKIP_INSTALL = YES`.
- [ ] App Store Connect still treats `The Devil's AI Dictionary` as the single Apple app record. Do not ship from or maintain a separate watch app record.
- [ ] Apple silicon Mac and Apple Vision Pro compatibility availability remain enabled for the iPhone/iPad app unless this release is intentionally iPhone/iPad-only.
- [ ] Native macOS and native visionOS version records, if part of the release, live under that same Apple record rather than as sibling apps.
- [ ] Developer Mode remains a testing-only surface and is unavailable in the public App Store release.

## OTA catalogue checks

- [ ] A fresh TestFlight install can boot from the bundled catalogue before any network refresh.
- [ ] Foreground launch can check the OTA manifest and replace the cached catalogue without blocking ordinary browsing.
- [ ] A deep link or pushed slug for a newly added entry retries once after refresh before showing a missing-entry state.
- [ ] A paired watch receives the refreshed catalogue from the phone and only accepts current-word payloads for the same catalogue version.
- [ ] Installing a newer TestFlight build does not overwrite a fresher on-device OTA cache with an older bundled seed.

## Upload and distribution

- [ ] The archive uploads to the existing App Store Connect record for `com.djngoma.devilsaidictionary`.
- [ ] Any native macOS or native visionOS builds are attached to the matching `MAC_OS` or `VISION_OS` version record under the same App Store Connect app.
- [ ] The build is visible to the internal `TestFlight` group after processing.
- [ ] If App Store Connect flags `MISSING_EXPORT_COMPLIANCE`, `usesNonExemptEncryption=false` has been set for the build.
- [ ] No signing keys, provisioning profiles, `.p8` files, temporary keychains, export plists, or `.ipa` artifacts are being committed.

## No-ship blockers

Do not ship if any of these are true:

- Offline first launch fails on a fresh install.
- Foreground refresh breaks browsing or corrupts the cached catalogue.
- A new slug still fails after the one refresh retry.
- The watch shows a current word for the wrong catalogue version.
- The archive shape, watch embedding, signing, or export-compliance state blocks TestFlight distribution.
