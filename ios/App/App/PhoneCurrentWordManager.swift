import Foundation
import OSLog
import UIKit
import UserNotifications
import WatchConnectivity

#if canImport(DevilsAIDictionaryCore)
import DevilsAIDictionaryCore
#endif

extension Notification.Name {
    static let currentWordDidChange = Notification.Name("CurrentWordDidChange")
    static let currentWordPendingNavigationDidChange = Notification.Name("CurrentWordPendingNavigationDidChange")
    static let currentWordPushStateDidChange = Notification.Name("CurrentWordPushStateDidChange")
}

@MainActor
final class PhoneCurrentWordManager {
    static let shared = PhoneCurrentWordManager()

    private let storage = CurrentWordStorage()
    private let installationRegistrar = PushInstallationRegistrar()
    private lazy var watchSessionCoordinator = PhoneWatchSessionCoordinator()

    private var catalogSnapshot: DictionaryCatalogSnapshot?
    private var configured = false
    private var lastPushAuthorizationState: PushAuthorizationState = .unknown

    private init() {}

    func configure(application: UIApplication) {
        guard !configured else {
            return
        }

        configured = true
        catalogSnapshot = try? DictionaryCatalogSnapshot.load()
        watchSessionCoordinator.activate()
        application.registerForRemoteNotifications()
        _ = ensureCurrentWord()

        Task {
            await refreshPushInstallation()
            notifyPushStateChanged()
        }
    }

    func getState() -> [String: Any] {
        var state: [String: Any] = [
            "isNativePushAvailable": true,
            "pushAuthorizationStatus": lastPushAuthorizationState.rawValue,
            "pushTokenAvailable": storage.loadPushDeviceToken() != nil,
        ]

        if let currentWord = ensureCurrentWord() {
            state["currentWord"] = currentWord.dictionaryRepresentation()
        }

        if let catalogSnapshot {
            state["catalogVersion"] = catalogSnapshot.version
        }

        if let pendingNavigationPath = storage.loadPendingNavigationPath() {
            state["pendingNavigationPath"] = pendingNavigationPath
        }

        return state
    }

    func refreshCurrentWord() -> CurrentWordRecord? {
        guard let catalogSnapshot,
              let record = catalogSnapshot.randomWord(
                  excluding: storage.loadCurrentWord()?.slug,
                  source: .manualRefresh
              )
        else {
            return storage.loadCurrentWord()
        }

        persistCurrentWord(record)
        return record
    }

    func requestPushAuthorization() async throws -> [String: Any] {
        let center = UNUserNotificationCenter.current()
        _ = try await center.requestAuthorization(options: [.alert, .badge, .sound])
        UIApplication.shared.registerForRemoteNotifications()
        await refreshPushInstallation()
        notifyPushStateChanged()
        return getState()
    }

    func registerDeviceToken(_ deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        storage.savePushDeviceToken(token)
        Task {
            await refreshPushInstallation()
            notifyPushStateChanged()
        }
    }

    func handleRemoteNotificationResponse(userInfo: [AnyHashable: Any]) {
        guard let slug = notificationSlug(from: userInfo),
              let record = catalogSnapshot?.currentWord(slug: slug, source: .notificationTap)
        else {
            return
        }

        persistCurrentWord(record)
        setPendingNavigationPath("/dictionary/\(slug)")
    }

    func handleIncomingURL(_ url: URL) -> Bool {
        guard let slug = navigationSlug(for: url),
              let record = catalogSnapshot?.currentWord(slug: slug, source: .phoneSync)
        else {
            return false
        }

        persistCurrentWord(record)
        setPendingNavigationPath("/dictionary/\(slug)")

        return true
    }

    func consumePendingNavigationPath(_ path: String?) {
        let storedPath = storage.loadPendingNavigationPath()

        guard path == nil || storedPath == path else {
            return
        }

        storage.savePendingNavigationPath(nil)
        NotificationCenter.default.post(name: .currentWordPendingNavigationDidChange, object: nil)
    }

    private func ensureCurrentWord() -> CurrentWordRecord? {
        if let currentWord = storage.loadCurrentWord() {
            return currentWord
        }

        guard let catalogSnapshot,
              let seeded = catalogSnapshot.randomWord(excluding: nil, source: .seeded)
        else {
            return nil
        }

        persistCurrentWord(seeded)
        return seeded
    }

    private func persistCurrentWord(_ record: CurrentWordRecord) {
        storage.saveCurrentWord(record)

        if let catalogSnapshot {
            watchSessionCoordinator.update(record: record, catalogVersion: catalogSnapshot.version)
        }

        NotificationCenter.default.post(name: .currentWordDidChange, object: nil)
    }

    private func setPendingNavigationPath(_ path: String) {
        storage.savePendingNavigationPath(path)
        NotificationCenter.default.post(name: .currentWordPendingNavigationDidChange, object: nil)
    }

    private func notifyPushStateChanged() {
        NotificationCenter.default.post(name: .currentWordPushStateDidChange, object: nil)
    }

    private func currentPushAuthorizationStatus() async -> PushAuthorizationState {
        let settings = await notificationSettings()
        let state = PushAuthorizationState(status: settings.authorizationStatus)
        lastPushAuthorizationState = state
        return state
    }

    private func notificationSettings() async -> UNNotificationSettings {
        await withCheckedContinuation { continuation in
            UNUserNotificationCenter.current().getNotificationSettings { settings in
                continuation.resume(returning: settings)
            }
        }
    }

    private func refreshPushInstallation() async {
        guard let token = storage.loadPushDeviceToken(),
              let baseURL = Bundle.main.object(forInfoDictionaryKey: "MobileAPIBaseURL") as? String,
              let url = URL(string: "\(baseURL)/api/mobile/push/installations")
        else {
            return
        }

        let status = await currentPushAuthorizationStatus()
        let payload = PushInstallationPayload(
            token: token,
            environment: {
                #if DEBUG
                "development"
                #else
                "production"
                #endif
            }(),
            optInStatus: status.rawValue,
            appVersion: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0",
            locale: Locale.preferredLanguages.first ?? Locale.current.identifier
        )

        await installationRegistrar.register(payload: payload, url: url)
    }

    private func notificationSlug(from userInfo: [AnyHashable: Any]) -> String? {
        if let slug = userInfo["slug"] as? String, !slug.isEmpty {
            return slug
        }

        if let slug = userInfo["dictionarySlug"] as? String, !slug.isEmpty {
            return slug
        }

        return nil
    }

    private func navigationSlug(for url: URL) -> String? {
        let components = url.pathComponents.filter { $0 != "/" }

        if url.scheme == "devilsaidictionary" {
            if url.host == "dictionary" {
                return components.first
            }

            if components.first == "dictionary" {
                return components.dropFirst().first
            }
        }

        if let host = url.host,
           ["thedevilsaidictionary.com", "www.thedevilsaidictionary.com"].contains(host),
           components.first == "dictionary" {
            return components.dropFirst().first
        }

        return nil
    }
}

private enum PushAuthorizationState: String {
    case authorized
    case denied
    case ephemeral
    case notDetermined
    case provisional
    case unsupported
    case unknown

    init(status: UNAuthorizationStatus) {
        switch status {
        case .authorized:
            self = .authorized
        case .denied:
            self = .denied
        case .ephemeral:
            self = .ephemeral
        case .notDetermined:
            self = .notDetermined
        case .provisional:
            self = .provisional
        @unknown default:
            self = .unknown
        }
    }
}

private struct PushInstallationPayload: Encodable {
    let token: String
    let platform = "ios"
    let environment: String
    let optInStatus: String
    let appVersion: String
    let locale: String
}

private actor PushInstallationRegistrar {
    private let logger = Logger(
        subsystem: "com.djngoma.devilsaidictionary",
        category: "PushInstallationRegistrar"
    )

    func register(payload: PushInstallationPayload, url: URL) async {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        do {
            request.httpBody = try JSONEncoder().encode(payload)
        } catch {
            logger.error("Failed to encode push installation payload: \(error.localizedDescription, privacy: .public)")
            return
        }

        do {
            let (_, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse,
               !(200...299).contains(httpResponse.statusCode) {
                logger.error(
                    "Push installation registration returned status \(httpResponse.statusCode, privacy: .public)"
                )
            }
        } catch {
            logger.error("Push installation registration failed: \(error.localizedDescription, privacy: .public)")
        }
    }
}

private final class PhoneWatchSessionCoordinator: NSObject, WCSessionDelegate {
    private let session = WCSession.isSupported() ? WCSession.default : nil

    func activate() {
        guard let session else {
            return
        }

        session.delegate = self
        session.activate()
    }

    func update(record: CurrentWordRecord, catalogVersion: String) {
        guard let session,
              session.isPaired,
              session.isWatchAppInstalled
        else {
            return
        }

        do {
            let applicationContext = try CurrentWordApplicationContext(
                payload: CurrentWordSyncPayload(
                    catalogVersion: catalogVersion,
                    currentWord: record
                )
            ).dictionaryRepresentation()
            try session.updateApplicationContext(applicationContext)
        } catch {
            return
        }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }

    func sessionWatchStateDidChange(_ session: WCSession) {}

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}
}
