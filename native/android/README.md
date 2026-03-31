# native/android

This directory is the canonical future home for the Kotlin/Compose Android app.

Today the shipping Android app still lives in `android/` as a Capacitor shell. There is also temporary native incubation code inside the host app:

- `android/app/src/main/java/com/djngoma/devilsaidictionary/nativeapp`

That package is a staging area, not the long-term project boundary.

When native Android work resumes:

- extract the incubator code into `native/android/` before adding more native feature surface
- keep `android/` focused on the shipping shell, bridge code, asset sync, and Play delivery plumbing
- reuse the existing application ID so upgrades happen in place
