import Capacitor
import Foundation

@objc(CurrentWordPlugin)
final class CurrentWordPlugin: CAPInstancePlugin, CAPBridgedPlugin {
    let identifier = "CurrentWordPlugin"
    let jsName = "CurrentWord"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "consumePendingNavigation", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "refreshCurrentWord", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPushPermission", returnType: CAPPluginReturnPromise),
    ]

    private let manager: PhoneCurrentWordManager

    init(manager: PhoneCurrentWordManager) {
        self.manager = manager
        super.init()
    }

    override func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleCurrentWordDidChange(_:)),
            name: .currentWordDidChange,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handlePendingNavigationDidChange(_:)),
            name: .currentWordPendingNavigationDidChange,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handlePushStateDidChange(_:)),
            name: .currentWordPushStateDidChange,
            object: nil
        )
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc func getState(_ call: CAPPluginCall) {
        Task { @MainActor in
            call.resolve(manager.getState())
        }
    }

    @objc func refreshCurrentWord(_ call: CAPPluginCall) {
        Task { @MainActor in
            let record = manager.refreshCurrentWord()
            call.resolve([
                "currentWord": record?.dictionaryRepresentation() as Any,
            ])
        }
    }

    @objc func requestPushPermission(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                let state = try await manager.requestPushAuthorization()
                call.resolve(state)
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func consumePendingNavigation(_ call: CAPPluginCall) {
        Task { @MainActor in
            manager.consumePendingNavigationPath(call.getString("path"))
            call.resolve(manager.getState())
        }
    }

    @objc private func handleCurrentWordDidChange(_ notification: Notification) {
        Task { @MainActor in
            notifyListeners("currentWordChanged", data: manager.getState(), retainUntilConsumed: true)
        }
    }

    @objc private func handlePendingNavigationDidChange(_ notification: Notification) {
        Task { @MainActor in
            notifyListeners("pendingNavigationChanged", data: manager.getState(), retainUntilConsumed: true)
        }
    }

    @objc private func handlePushStateDidChange(_ notification: Notification) {
        Task { @MainActor in
            notifyListeners("pushStateChanged", data: manager.getState(), retainUntilConsumed: true)
        }
    }
}
