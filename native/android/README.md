# native/android

This directory is a deferred placeholder for any future Android project split.

The shipping Android app lives in `android/` for now. Keep this directory empty until there is a concrete reason to split the Android project boundary.

When a future split becomes worthwhile:

- move the Android app here as a standalone Kotlin/Compose project
- keep the existing application ID so upgrades happen in place
