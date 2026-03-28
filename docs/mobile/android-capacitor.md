# Android Capacitor delivery

This repo ships Android from the same static export used by the iOS shell. The Android app bundles `out/` into the WebView and does not depend on a production URL at runtime.

## First-time setup

```bash
npm install
npm run android:assets
npm run android:sync
```

Then open Android Studio:

```bash
npm run android:open
```

## Repeatable update flow

```bash
npm run android:prepare
```

That command:

- statically exports the Next.js app into `out/`
- refreshes Android icons and splash assets from `assets/logo.svg`
- syncs the bundled web assets into the Android project

## Local build commands

```bash
npm run android:build:debug
npm run android:build:release:apk
npm run android:build:release:bundle
```

The npm build commands try to locate a suitable local JDK automatically. On this machine the safe path is Homebrew `openjdk@21`.

Artifacts land here:

- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

Direct install for the Samsung A30s:

```bash
npm run android:install:release
```

## Release signing

Play-ready release artifacts require signing credentials. The Gradle build reads either:

- `android/keystore.properties`
- or environment variables

Supported keys:

- `RELEASE_STORE_FILE` or `ANDROID_KEYSTORE_FILE`
- `RELEASE_STORE_PASSWORD` or `ANDROID_KEYSTORE_PASSWORD`
- `RELEASE_KEY_ALIAS` or `ANDROID_KEY_ALIAS`
- `RELEASE_KEY_PASSWORD` or `ANDROID_KEY_PASSWORD`

Copy `android/keystore.properties.example` to `android/keystore.properties` and replace the placeholder values before producing store builds.

If those values are absent, release builds still complete with debug signing so CI and local smoke checks do not stall. Those artifacts are not for Play upload.

## Android defaults

- Application ID: `com.djngoma.devilsaidictionary`
- `minSdkVersion`: 24
- `targetSdkVersion`: 35
- `compileSdkVersion`: 36
- Runtime model: bundled static export only

## Google Play testing flow

1. Create the Play app record with package `com.djngoma.devilsaidictionary`.
2. Upload the signed AAB to internal testing first.
3. Validate install, upgrade, and basic navigation.
4. Promote the same app record to open testing when internal checks are clean.
5. Keep the app record and package for the later native Android replacement.

## Samsung A30s checklist

- Keep Android 11 WebView compatibility in scope. This repo flattens Tailwind cascade layers in PostCSS because Chrome/WebView 87 ignores raw `@layer` blocks and otherwise drops most layout styling.
- Install the release APK on Android 11 / API 30.
- Test cold launch with airplane mode enabled after first install.
- Test home, dictionary, categories, search, random, and entry detail.
- Confirm bookmark persistence after force-close and relaunch.
- Confirm theme persistence after relaunch.
- Check external links leave the app correctly.
- Watch search responsiveness and scrolling on the physical device before moving to open testing.
