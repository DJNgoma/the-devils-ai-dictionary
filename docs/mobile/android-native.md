# Android native delivery

Android now ships as a native Kotlin/Compose app from `android/`.

`native/android/` remains a deferred placeholder only. Do not move product work there yet.

## First-time setup

```bash
npm install
node scripts/with-android-java.mjs ./android/gradlew -p android testDebugUnitTest assembleDebug
```

Open Android Studio on the native app module if you want a GUI workflow:

```bash
open -a 'Android Studio' android
```

## Repeatable update flow

```bash
npm run android:prepare
node scripts/with-android-java.mjs ./android/gradlew -p android testDebugUnitTest assembleDebug
```

Those commands:

- regenerate the bundled content snapshot and Android art assets
- builds the native Android app
- runs the native unit tests
- compile the bundled content snapshot into the app assets

## Local build commands

```bash
node scripts/with-android-java.mjs ./android/gradlew -p android installDebug
node scripts/with-android-java.mjs ./android/gradlew -p android assembleDebug
node scripts/with-android-java.mjs ./android/gradlew -p android assembleRelease
node scripts/with-android-java.mjs ./android/gradlew -p android bundleRelease
```

Artifacts land here:

- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

Direct install for a connected device:

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
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
- Runtime model: bundled native app with on-device catalog, theme, saved-place, and current-word state

## Google Play testing flow

1. Create the Play app record with package `com.djngoma.devilsaidictionary`.
2. Upload the signed AAB to internal testing first.
3. Validate install, upgrade, cold launch, and the core `Home`, `Browse`, `Search`, and `Saved` flows.
4. Promote the same app record to open testing when internal checks are clean.
5. Keep the app record and package fixed so future extraction work does not change app identity.

## Device notes

Use the shared release checklist in [`checklists.md`](./checklists.md) for Android QA sign-off.

Android-specific reminders:

- Keep the physical-device sweep on both Samsung 3-button navigation and Pixel gesture navigation.
- If a shared test device already has a differently signed build installed, use the signed release APK for install and upgrade checks instead of the debug build.
