# Native follow-on roadmap

## Repo shape

Keep one monorepo:

- root web app remains the source of truth for content authoring and the current production site UI
- `ios/App/App` now hosts the native SwiftUI iPhone app that reuses the shipping bundle identifier
- `native/android` is reserved for the future Kotlin/Compose app
- `shared/swift-core` is the shared Swift package for read-only domain logic

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

## Native Android

- Build in `native/android`
- Use Kotlin and Jetpack Compose
- Reuse application ID `com.djngoma.devilsaidictionary`
- Integrate `shared/swift-core` only through a narrow, stable interop layer after the Swift package has proven itself on iOS native first

## Sequence

1. Stabilize the JSON contract and shared Swift package.
2. Ship native iOS from the existing Xcode target.
3. Keep Android Capacitor healthy for store delivery.
4. Build native Android.
