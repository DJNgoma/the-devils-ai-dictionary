# native

This directory is only for app code that is meant to become a first-class native project.

Current boundaries:

- `ios/` is the shipping native Apple app and the only source of truth for iPhone code.
- `android/` is the shipping native Android app and release pipeline.
- `native/android/` is a deferred placeholder only if the Android app is later split into a separate project.

Do not recreate an iOS placeholder here, and do not move active Android product code out of `android/` without a deliberate project-split decision.
