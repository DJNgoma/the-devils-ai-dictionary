# Google Play testing

This runbook is the repo-side path for getting the Android app into Play Console testing without producing the wrong artifact by accident.

Use it alongside:

- [Android native delivery](./android-native.md)
- [Mobile checklists](./checklists.md)
- [Shared release versioning](../release-versioning.md)

## Terms that matter

- Internal testing is the quickest Play Console track. Google currently caps it at 100 testers, and the app is shared by URL rather than public Play discovery.
- Open testing is the closest thing to "external testing" in Play Console. The test listing is visible on Google Play and anyone can opt in.
- Closed testing is the private wider-beta track. If your Play Console account is a newly created personal developer account, Google currently requires a closed test with at least 12 opted-in testers for 14 continuous days before production access is granted. Open testing also requires production access on those accounts.

Official references:

- [Set up an open, closed, or internal test](https://support.google.com/googleplay/android-developer/answer/9845334)
- [Prepare and roll out a release](https://support.google.com/googleplay/android-developer/answer/9859348)
- [App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Sign your app](https://developer.android.com/studio/publish/app-signing)
- [Upload your app to the Play Console](https://developer.android.com/studio/publish/upload-bundle)

## Repo commands

Local release smoke build only:

```bash
npm run android:build:release:bundle
```

That command still permits debug signing so local build checks do not stall. Do not upload that artifact to Play unless you know the release signing credentials were present.

Play-ready commands:

```bash
npm run android:build:play:apk
npm run android:build:play:bundle
npm run android:verify:play
npm run android:play:tasks
npm run android:play:bootstrap
npm run android:play:publish:internal
npm run android:play:publish:open
npm run android:play:promote:open
```

Those commands require real release signing. They fail immediately if the upload keystore is missing or incomplete.

`android:play:publish:open` uses the Play Developer API `beta` track name, which is the historical API name that Gradle Play Publisher still expects for the open-testing track.

## Signing expectations

The Play upload path uses an upload key, not the app-signing key that Google manages after Play App Signing is configured.

Keep these local only:

- `android/keystore.properties`
- the `.jks` or `.keystore` file referenced by it

Supported keys:

- `RELEASE_STORE_FILE` or `ANDROID_KEYSTORE_FILE`
- `RELEASE_STORE_PASSWORD` or `ANDROID_KEYSTORE_PASSWORD`
- `RELEASE_KEY_ALIAS` or `ANDROID_KEY_ALIAS`
- `RELEASE_KEY_PASSWORD` or `ANDROID_KEY_PASSWORD`

The checked-in example is:

```properties
RELEASE_STORE_FILE=app/upload-keystore.jks
RELEASE_STORE_PASSWORD=replace-me
RELEASE_KEY_ALIAS=upload
RELEASE_KEY_PASSWORD=replace-me
```

Copy `android/keystore.properties.example` to `android/keystore.properties` and replace the placeholder values with the actual upload-key settings.

## Gradle Play Publisher credentials

The repo now includes Gradle Play Publisher in the Android app module. It can authenticate in three ways:

1. `PLAY_SERVICE_ACCOUNT_CREDENTIALS_FILE` pointing at a JSON service-account key file, for example `android/play-account.json`
2. `ANDROID_PUBLISHER_CREDENTIALS` containing the raw JSON credentials content
3. `PLAY_USE_APPLICATION_DEFAULT_CREDENTIALS=true`, with optional `PLAY_IMPERSONATE_SERVICE_ACCOUNT`

The safest local default is a JSON key file kept outside git. If you want it inside the Android folder for local use, `android/play-account.json` is now ignored by git.

Before the first publish task:

1. Create or reuse a Google Cloud project.
2. Enable the Android Publisher API for that project.
3. Create a service account and JSON key.
4. In Play Console, invite that service account as a user on the app with release access to the testing tracks you intend to use.
5. Run `npm run android:play:bootstrap` to validate that Gradle can talk to Google Play.

## Testing flow

1. Bump `app-version.json` `buildNumber` for each new Play upload.
2. Keep `package.json` `version` unchanged unless the release is user-visible in the marketing sense.
3. Run `npm run version:sync` after any build-number bump so the Apple project stays aligned.
4. Run `npm run android:verify:play` to produce a signed AAB and re-run the native Android unit tests.
5. Upload `android/app/build/outputs/bundle/release/app-release.aab` to the desired Play track.
6. For local physical-device smoke checks with the same signing, build `npm run android:build:play:apk` and sideload `android/app/build/outputs/apk/release/app-release.apk`.

Or let Gradle Play Publisher handle the upload:

1. `npm run android:play:publish:internal` for the internal track
2. `npm run android:play:publish:open` for the open-testing track
3. `npm run android:play:promote:open` to promote the current internal artifact to the open-testing track

For a closed testing track with a custom track name, run the Gradle task directly, for example:

```bash
node scripts/with-android-java.mjs ./android/gradlew -p android \
  -PREQUIRE_RELEASE_SIGNING=true publishReleaseBundle --track qa-team
```

## Console sequence

1. Create or open the Play Console app record for package `com.djngoma.devilsaidictionary`.
2. Finish the required setup pages before attempting a release:
   - app access
   - ads declaration
   - content rating
   - target audience
   - data safety and privacy policy as required by your current app behaviour
3. Enrol in Play App Signing if this is the first Play release for the app.
4. Upload the signed AAB on `Testing > Internal testing` first, either in the web console or with `npm run android:play:publish:internal`.
5. Share the internal test URL with the first-device group and confirm install, upgrade, cold launch, persistence, and offline launch behaviour.
6. If your account can use open testing, promote or create a release on `Testing > Open testing` after the internal pass is clean. In Gradle Play Publisher this is the `beta` track.
7. If your account must satisfy the personal-account testing rule, run the required closed test before expecting production or open-testing access.
8. Review the pre-launch report on open or closed testing and clear any obvious crashes, rendering failures, accessibility blockers, or policy issues before widening access.

## Artifact paths

- Signed Play AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- Signed release APK: `android/app/build/outputs/apk/release/app-release.apk`

## What stays manual

- Play Console setup and policy questionnaires
- Tester lists, opt-in URLs, and country targeting
- Screenshots, feature graphic, and the final support email or inbox
- Physical-device QA on Samsung Galaxy A30s and Pixel 5

Draft listing copy, privacy policy URL, support URLs, and testing-track notes now live in [Store listing copy](./store-listing-copy.md).
