# Native Android follow-on roadmap

## Repo shape

Keep one monorepo:

- root web app remains the source of truth for content authoring and the current production site UI
- `ios/App` is the shipping native Apple app and the only source of truth for iPhone code
- `android/` is the shipping Capacitor shell and release pipeline
- `native/android/` is the canonical destination for the future Kotlin/Compose app
- `shared/swift-core` is the shared Swift package for read-only domain logic

Do not recreate `native/ios`, and do not let `android/app/src/main/java/com/djngoma/devilsaidictionary/nativeapp` become the long-term home for Android-native product code.

## Shared boundary

The canonical cross-client contract is `src/generated/entries.generated.json`.

Use Swift for:

- entry and catalog models
- category metadata
- lookup helpers
- featured/recent/misunderstood selectors
- faceted filter logic
- bookmark DTOs and persistence shape

Do not use Swift for:

- UI
- navigation
- Android packaging or lifecycle
- full-text search indexing strategy

## Native iOS

- Ship from `ios/App/App`
- Use SwiftUI
- Reuse bundle identifier `com.djngoma.devilsaidictionary`
- Load the bundled content snapshot first, then adopt `shared/swift-core` for domain logic
- Treat the iOS migration as complete from a repo-structure perspective

## Native Android

- Build in `native/android`
- Use Kotlin and Jetpack Compose
- Reuse application ID `com.djngoma.devilsaidictionary`
- Integrate `shared/swift-core` only through a narrow, stable interop layer after the Swift package has proven itself on iOS native first
- Extract any current incubator code from `android/app/src/main/java/com/djngoma/devilsaidictionary/nativeapp` before adding more native feature surface

## Sequence

1. Stabilize the JSON contract and shared Swift package.
2. Ship native iOS from the existing Xcode target.
3. Keep Android Capacitor healthy for store delivery.
4. Extract the temporary Android incubator package into `native/android/`.
5. Build native Android there.
