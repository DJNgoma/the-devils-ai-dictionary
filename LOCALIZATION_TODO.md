# Localization

## In-app language override (done)

Users can pick a preferred app language independently of the system language.
The choice is persisted in `UserDefaults` under `app-language-override`
(see `AppLanguageOverride` in `ios/App/SharedApple/CurrentWordStorage.swift`).
An empty string means "follow the system."

The override is threaded through every Apple scene root via
`.environment(\.locale, …)`:

- iOS, macOS, and visionOS — `NativeDictionaryApp.swift` (one file, three
  target memberships in the Xcode project).
- watchOS — `TheDevilsAIDictionaryWatch/TheDevilsAIDictionaryWatchApp.swift`.

The picker UI lives in the iOS Settings tab (`NativeSettingsView` in
`NativeDictionaryRootView.swift`). It populates from
`Bundle.main.localizations`, filtered to drop the synthetic `Base` entry, and
falls back to `["en"]` when introspection comes up empty (UI tests, previews).

### Why the picker is currently hidden in the shipped build

`Bundle.main.localizations` for the iOS app today resolves to `["en"]` — the
bundle only ships `Base.lproj`. A one-item dropdown is worse than no dropdown,
so the Settings card is conditionally rendered:

```swift
if AppLanguageOverride.availableLanguages().count > 1 { … }
```

The plumbing stays in place. The day a translator drops in, e.g., `fr.lproj`,
the picker resurfaces automatically and starts respecting the stored override
across all four Apple targets. No code change required at that point — only
the new `.strings` / `.stringsdict` resources.

## Metadata-locale alignment

There is no drift today: the App Store listing copy in
`docs/mobile/store-listing-copy.md` is single-locale (English), the bundle is
single-locale (English), and the system fallback path is English. The screenshot
generator (`aso-appstore-screenshots`) is also being driven from the same
English source.

Future invariants when a second locale lands:

1. Adding `xx.lproj` to the iOS, macOS, watchOS, and visionOS targets must be
   paired with adding the matching App Store Connect locale (Description,
   Promotional Text, Keywords) and the matching screenshot set.
2. App Store metadata locales should always be a **subset** of bundle locales
   — never the other way around. Listing a locale on App Store Connect that
   the bundle cannot render produces an inconsistent first-launch experience
   for that user.
3. The picker label uses `Locale.current.localizedString(forIdentifier:)` for
   display, so each new bundle locale should be sanity-checked to confirm the
   rendered name in *another* locale is acceptable (e.g. how `fr` renders
   when the device is `de`).

## Web shell decision

There is no Capacitor / Cordova / `WKWebView` host in any of the four Apple
targets — every UI is native SwiftUI (verified by grepping
`ios/App/TheDevilsAIDictionary/`). The override therefore only needs to flow
through SwiftUI's `\.locale` environment; there is no web layer that would
need a parallel `navigator.language` shim or `<html lang>` hand-off.

If a web shell is ever reintroduced (a marketing companion view, an embedded
dictionary surface, etc.) the contract becomes:

- Read `AppLanguageOverride.storageKey` from `UserDefaults` on the native side.
- Pass the resolved BCP-47 tag (`""` → device default) to the web view via
  the initial config message *and* on every subsequent change observed via
  `UserDefaults.didChangeNotification` filtered for the override key.
- The web view sets `<html lang>` and any i18n runtime accordingly, never
  reads `navigator.language` directly for app strings.
