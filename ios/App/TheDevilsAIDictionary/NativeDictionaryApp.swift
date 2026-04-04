import SwiftUI

@MainActor
@main
struct NativeDictionaryApp: App {
    #if os(iOS)
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    #endif

    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var model = NativeDictionaryModel(manager: PhoneCurrentWordManager.shared)
    #if os(iOS)
    @State private var showSplash = true
    #endif

    var body: some Scene {
        WindowGroup {
            ZStack {
                NativeDictionaryRootView(model: model)
                    .task {
                    PhoneCurrentWordManager.shared.configureForCurrentPlatform()
                    await model.handleSceneActivation()
                    await model.checkLiveCatalogIfNeeded()
                }
                .task(id: scenePhase) {
                    guard scenePhase == .active else {
                        return
                    }

                    await model.handleSceneActivation()
                }
                .onOpenURL { url in
                    _ = PhoneCurrentWordManager.shared.handleIncomingURL(url)
                }

                #if os(iOS)
                if showSplash {
                    SplashScreenView {
                        showSplash = false
                    }
                    .ignoresSafeArea()
                }
                #endif
            }
        }
    }
}
