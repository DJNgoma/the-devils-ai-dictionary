# native/android

Reserved for the eventual extraction of the Android native app into its own project.

For now, the active Android native migration lives inside the existing host app:

- `android/app/src/main/java/com/djngoma/devilsaidictionary/nativeapp`

That mirrors the current iOS migration pattern, where the native views also still live beside the shipped Capacitor host rather than in `native/ios`.
