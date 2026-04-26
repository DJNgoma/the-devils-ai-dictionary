import SwiftUI

@main
struct TheDevilsAIDictionaryWatchApp: App {
    @StateObject private var model = WatchCurrentWordModel()
    @AppStorage(AppLanguageOverride.storageKey)
    private var storedLanguageOverride = AppLanguageOverride.systemDefaultStoredValue

    var body: some Scene {
        WindowGroup {
            WatchCurrentWordView(model: model)
                .environment(
                    \.locale,
                    AppLanguageOverride.resolvedLocale(forStoredValue: storedLanguageOverride)
                        ?? Locale.current
                )
        }
    }
}
