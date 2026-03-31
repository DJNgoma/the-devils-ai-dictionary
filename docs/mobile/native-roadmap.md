# Android cutover notes

## Repo shape

Keep one monorepo:

- root web app remains the source of truth for content authoring and the current production site UI
- `ios/App` is the shipping native Apple app and the only source of truth for iPhone code
- `android/` is the shipping native Android app and release pipeline
- `native/android/` is the deferred placeholder for any later Android project split
- `shared/swift-core` is the shared Swift package for read-only domain logic on Apple platforms

Do not recreate `native/ios`.

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
- Android UI or search indexing strategy

## Native iOS

- Ship from `ios/App/App`
- Use SwiftUI
- Reuse bundle identifier `com.djngoma.devilsaidictionary`
- Load the bundled content snapshot first, then adopt `shared/swift-core` for domain logic
- Treat the iOS migration as complete from a repo-structure perspective

## Native Android

- Build in `android`
- Use Kotlin and Jetpack Compose
- Reuse application ID `com.djngoma.devilsaidictionary`
- Keep the app local-first with the bundled generated catalog, on-device saved-place state, and current-word state
- Preserve the launcher-level deep-link and route behavior already in the native Android app
- Keep `native/android/` empty until a future project split is explicitly justified

## Sequence

1. Stabilize the JSON contract and shared Swift package.
2. Ship native iOS from the existing Xcode target.
3. Harden the native Android app in `android/`.
4. Keep `native/android/` as a placeholder only.
5. Split Android into `native/android/` only if the repo boundary later becomes worth the churn.
