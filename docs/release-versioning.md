# Release versioning

This repo now keeps release numbering on two tracks:

- `package.json` `version` is the shared marketing version for Web, Apple, Android, and Windows.
- `app-version.json` `buildNumber` is the monotonically increasing build number for packaged binaries.

Current defaults:

- Web build version: `package.json` `version`
- Apple `MARKETING_VERSION`: `package.json` `version`
- Apple `CURRENT_PROJECT_VERSION`: `app-version.json` `buildNumber`
- Android `versionName`: `package.json` `version`
- Android `versionCode`: `app-version.json` `buildNumber`
- Windows desktop package version: `package.json` `version`
- Windows desktop build version / file version: `package.json` `version`.`app-version.json` `buildNumber`

## The rule

1. Bump `package.json` `version` when the release is meaningfully new to a person using it.
2. Bump `app-version.json` `buildNumber` every time you create a new Apple, Android, or Windows distributable that should be treated as a distinct build.
3. Do not decrease or recycle `buildNumber`. Store pipelines are humourless about this.
4. A web-only redeploy of the same release can keep both numbers unchanged.
5. A binary rebuild of the same release keeps the same marketing version and gets a new build number.
6. A new release that also ships new binaries gets both: a new marketing version and a new build number.

## Practical decisions

- Web-only content or code release: bump `package.json` `version`; leave `buildNumber` alone unless you also want a new desktop package.
- TestFlight upload from the same release line: keep `package.json` `version`; increment `buildNumber`.
- Play Console upload from the same release line: keep `package.json` `version`; increment `buildNumber`.
- Windows desktop zip from the same release line: keep `package.json` `version`; increment `buildNumber`.
- Cross-platform release with user-visible changes everywhere: bump both.

## Commands

```bash
npm run version:sync
npm run version:check
npm run build
npm run build:mobile
npm run android:build:release:bundle
npm run android:build:play:bundle
npm run ios:prepare
npm run windows:build
```

`npm run version:sync` updates the Apple Xcode project so the checked-in build settings match `package.json` and `app-version.json`.
Android and Windows derive their version settings directly from those same files at build time, so they do not need a separate sync step.

Use `npm run android:build:play:bundle` when the output is intended for Play Console. The older `android:build:release:bundle` path remains useful for local smoke builds because it can still fall back to debug signing.

## Notes

- Apple and Android still allow environment overrides for exceptional cases, but the checked-in defaults should be the ordinary path.
- Do not hand-edit Apple version fields in Xcode unless you intend to make the repo dirty and then reconcile it with `npm run version:sync`.
- The Windows build is an Electron wrapper around the exported static site. Its package version follows `package.json`, and its build/file version now follows `package.json version`.`app-version.json buildNumber` so binary builds stay distinguishable from web-only releases.
