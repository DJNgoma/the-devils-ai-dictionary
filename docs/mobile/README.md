# Mobile runbooks

This repo keeps the shipping web app at the root and treats mobile as two shipping apps plus one deferred placeholder:

- native iPhone delivery in the existing `ios/App` target
- native Android delivery from the existing `android/` module
- `native/android/` as a deferred placeholder if the Android app is ever split into a separate project

Directory boundaries:

- `ios/` is the real native Apple app
- `android/` is the shipping native Android app
- `native/android/` stays empty until a future Android project split is justified

## One-command workflows

```bash
npm run version:sync
npm run ios:prepare
npm run swift-core:test
node scripts/with-android-java.mjs ./android/gradlew -p android testDebugUnitTest assembleDebug
node scripts/with-android-java.mjs ./android/gradlew -p android assembleRelease
```

Legacy static-export verification for the root app remains available with `npm run build:mobile`.

## Runbooks

- [Android native delivery](./android-native.md)
- [Google Play testing](./google-play-testing.md)
- [Store listing copy](./store-listing-copy.md)
- [iOS push and watch v1](./ios-watch-push-v1.md)
- [Mobile design system](./design-system.md)
- [Android cutover notes](./native-roadmap.md)
- [Store, signing, and QA checklists](./checklists.md)
- [Shared release versioning](../release-versioning.md)
