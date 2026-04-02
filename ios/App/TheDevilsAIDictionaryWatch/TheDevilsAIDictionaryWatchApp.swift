import SwiftUI

@main
struct TheDevilsAIDictionaryWatchApp: App {
    @StateObject private var model = WatchCurrentWordModel()

    var body: some Scene {
        WindowGroup {
            WatchCurrentWordView(model: model)
        }
    }
}
