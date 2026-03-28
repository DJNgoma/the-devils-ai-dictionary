# Next steps

## Mobile (Capacitor)

- **iOS:** Run `npm run ios:open`, choose a Simulator or device, set **Signing & Capabilities** for a physical device, then build/run. For TestFlight, follow [docs/ios-testflight.md](docs/ios-testflight.md) (version/build, Archive, upload to App Store Connect).
- **Android:** Install the latest debug build (`android/app/build/outputs/apk/debug/app-debug.apk`) with `adb install -r`, or run `npm run android:run` with an emulator/device. For Play, use a signed AAB and [docs/mobile/android-capacitor.md](docs/mobile/android-capacitor.md).
- **After web changes:** Regenerate the bundle with `npm run ios:prepare` and/or `npm run android:prepare`, or one export plus both syncs (see README mobile section).

## CI and quality

- Before merging: `npm run verify:ci` (matches the `web-content` GitHub Actions job).
- Full CI also runs Android Gradle, iOS `xcodebuild`, and `shared/swift-core` tests; replicate locally when touching those areas.

## Tech follow-ups (non-blocking)

- **Next.js `middleware` → `proxy`:** Builds will warn until the file is renamed and the export is `proxy`. Do **not** migrate `src/middleware.ts` blindly: [README](README.md) (Cloudflare section) notes the OpenNext Cloudflare adapter still expects this edge middleware for the `www` → apex redirect; confirm adapter support for `proxy.ts`, then run `npx @next/codemod@canary middleware-to-proxy .` or mirror [Proxy docs](https://nextjs.org/docs/app/api-reference/file-conventions/proxy), and re-test `npm run build:cf` / `preview:cf`.
