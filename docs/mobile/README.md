# Mobile runbooks

This repo keeps the shipping web app at the root and treats mobile as three related tracks:

- Capacitor iOS for near-term App Store delivery
- Capacitor Android for near-term Play internal/open testing and direct APK installs
- Native follow-on apps in `native/ios` and `native/android`, with shared read-only Swift domain logic in `shared/swift-core`

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
- [Native follow-on roadmap](./native-roadmap.md)
- [Store, signing, and QA checklists](./checklists.md)
