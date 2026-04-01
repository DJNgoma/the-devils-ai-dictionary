import SwiftUI

@main
struct DictionaryWatchApp: App {
    @StateObject private var model = WatchCurrentWordModel()

    var body: some Scene {
        WindowGroup {
            WatchCurrentWordView(model: model)
        }
    }
}
