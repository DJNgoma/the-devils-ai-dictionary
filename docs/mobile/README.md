# Mobile runbooks

This repo keeps the shipping web app at the root and treats mobile as three related tracks:

- native iPhone delivery in the existing `ios/App` target
- Capacitor Android as the transitional Play/internal delivery path until the native Android app takes over
- shared read-only Swift domain logic in `shared/swift-core`, with Android native still a future track

Directory boundaries:

- `ios/` is the real native Apple app
- `android/` is the transitional Capacitor shell
- `native/android/` is the canonical future home for the Kotlin/Compose app
- `android/app/src/main/java/com/djngoma/devilsaidictionary/nativeapp` is temporary incubation code, not the long-term Android-native home

## One-command workflows

```bash
npm run ios:prepare
npm run android:prepare
npm run android:build:debug
npm run android:build:release:apk
npm run android:build:release:bundle
npm run swift-core:test
```

## Runbooks

- [Android Capacitor delivery](./android-capacitor.md)
- [iOS push and watch v1](./ios-watch-push-v1.md)
- [Mobile design system](./design-system.md)
- [Native Android follow-on roadmap](./native-roadmap.md)
- [Store, signing, and QA checklists](./checklists.md)

The native iPhone app owns push registration, notification handling, and watch sync. The Next app no longer carries a separate iPhone push bridge.
