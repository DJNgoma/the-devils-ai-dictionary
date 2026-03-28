# iOS and TestFlight

This repo ships the iOS app as a Capacitor wrapper around a statically exported build of the site. The native app bundles the generated `out/` directory, so it does not depend on a production webview URL at runtime.

## First-time setup

1. Install JavaScript dependencies:

   ```bash
   npm install
   ```

2. Create the native iOS project once:

   ```bash
   npx cap add ios
   ```

3. Generate icons and splash assets from `assets/logo.svg`:

   ```bash
   npm run ios:assets
   ```

## Repeatable update flow

When the web app changes and you want a fresh iOS build:

```bash
npm run ios:prepare
```

That command:

- statically exports the Next.js app into `out/`
- syncs the bundled web assets into `ios/App/App/public`
- updates Capacitor metadata for the iOS target

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

- The remaining gate for an actual TestFlight upload is Apple signing and App Store Connect metadata, not the web bundle.
- `npm run build:mobile` uses `NEXT_OUTPUT_MODE=export`, which turns the site into bundled static assets suitable for Capacitor.
- The ordinary website deploy remains the Cloudflare path documented in the main README.
