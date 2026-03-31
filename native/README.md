# native

This directory is only for app code that is meant to become a first-class native project.

Current boundaries:

- `ios/` is the shipping native Apple app and the only source of truth for iPhone code.
- `android/` is the shipping Capacitor Android shell and release pipeline.
- `native/android/` is the canonical future home for the Kotlin/Compose Android app.

Do not recreate an iOS placeholder here, and do not treat the Capacitor host as the long-term home for future Android-native product code.
