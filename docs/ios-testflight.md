# iOS and TestFlight

This repo now ships the iPhone app as a native SwiftUI client inside `ios/App/App`. It reads the bundled `src/generated/entries.generated.json` snapshot directly, so it does not depend on a production webview URL or a synced `out/` directory at runtime.

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

## Xcode checklist before TestFlight

Inside Xcode:

1. Open the `App` target in `ios/App`.
2. Set your Apple Developer Team in `Signing & Capabilities`.
3. Confirm the bundle identifier. This repo uses `com.djngoma.devilsaidictionary` by default.
4. Set the marketing version and build number in the target settings.
5. Choose an iPhone or `Any iOS Device (arm64)` destination.
6. Run one local build.
7. Archive the app with `Product` -> `Archive`.
8. In the Organizer, choose `Distribute App` -> `App Store Connect` -> `Upload`.

## Notes

- The remaining gate for an actual TestFlight upload is Apple signing and App Store Connect metadata, not a web bundle sync.
- `src/generated/entries.generated.json` is copied directly into the app target, so `npm run content:build` is the iOS content prerequisite.
- The ordinary website deploy remains the Cloudflare path documented in the main README.
