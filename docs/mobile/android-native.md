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
- build the native Android app
- run the native unit tests
- compile the bundled content snapshot into the app assets

## Local build commands

```bash
node scripts/with-android-java.mjs ./android/gradlew -p android installDebug
node scripts/with-android-java.mjs ./android/gradlew -p android assembleDebug
node scripts/with-android-java.mjs ./android/gradlew -p android assembleRelease
node scripts/with-android-java.mjs ./android/gradlew -p android bundleRelease
npm run android:play:tasks
npm run android:play:bootstrap
npm run android:build:play:apk
npm run android:build:play:bundle
npm run android:verify:play
npm run android:play:publish:internal
npm run android:play:publish:open
```

Artifacts land here:

- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

Direct install for a connected device:

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

## Version source

- `versionName` defaults to `package.json` `version`
- `versionCode` defaults to `app-version.json` `buildNumber`
- `APP_VERSION_NAME` and `APP_VERSION_CODE` still override those values if you deliberately pass them

Ordinary release rule:

- bump `package.json` `version` for a new user-facing release
- bump `app-version.json` `buildNumber` for every new Play-bound build

The shared rule is documented in [`docs/release-versioning.md`](../release-versioning.md).

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

Use these commands when the artifact is actually intended for Play or for device testing with the real upload key:

```bash
npm run android:build:play:apk
npm run android:build:play:bundle
npm run android:verify:play
npm run android:play:publish:internal
npm run android:play:publish:open
```

Those commands fail fast if signing material is missing.

Gradle Play Publisher can authenticate with:

- `PLAY_SERVICE_ACCOUNT_CREDENTIALS_FILE`
- `ANDROID_PUBLISHER_CREDENTIALS`
- `PLAY_USE_APPLICATION_DEFAULT_CREDENTIALS=true`

`npm run android:play:bootstrap` is the quickest sanity check once the service account has Play Console access.

## Android defaults

- Application ID: `com.djngoma.devilsaidictionary`
- `minSdkVersion`: 24
- `targetSdkVersion`: 35
- `compileSdkVersion`: 36
- Runtime model: bundled native app with on-device catalog, theme, saved-place, and current-word state
- Verified HTTPS app links now target `https://thedevilsaidictionary.com/dictionary/<slug>` via `public/.well-known/assetlinks.json`

If Play App Signing later gives Google-managed devices a different signing certificate from the local upload key, add that Play app-signing SHA-256 fingerprint to `public/.well-known/assetlinks.json` as a second entry before expecting verified links from Play installs to stay silent.

## Google Play testing flow

1. Create the Play app record with package `com.djngoma.devilsaidictionary`.
2. Build the signed bundle with `npm run android:verify:play`.
3. Upload the signed AAB to internal testing first, either manually or with `npm run android:play:publish:internal`.
4. Validate install, upgrade, cold launch, and the core `Home`, `Browse`, `Search`, and `Saved` flows.
5. Move to open testing when internal checks are clean with `npm run android:play:publish:open`, or use a closed test first if your Play account requires that gate before open or production access.
6. Keep the app record and package fixed so future extraction work does not change app identity.

The track-specific notes live in [Google Play testing](./google-play-testing.md).

## Device checklist

- Samsung Galaxy A30s: install the release APK on Android 11 / API 30.
- Samsung Galaxy A30s: test cold launch with airplane mode enabled after first install.
- Samsung Galaxy A30s: test home, dictionary, categories, search, random, and entry detail.
- Samsung Galaxy A30s: confirm bookmark persistence after force-close and relaunch.
- Samsung Galaxy A30s: confirm theme persistence after relaunch.
- Samsung Galaxy A30s: check external links leave the app correctly.
- Samsung Galaxy A30s: watch search responsiveness and scrolling on the physical device before moving to open testing.
- Pixel 5: install the same signed release APK on Android 13 / API 33.
- Pixel 5: repeat the offline cold-launch check.
- Pixel 5: manually tap through Home, Dictionary, Categories, Search, Random, and at least one entry detail page.
- Pixel 5: confirm bookmark persistence after force-close and relaunch.
- Pixel 5: confirm theme persistence after relaunch.
