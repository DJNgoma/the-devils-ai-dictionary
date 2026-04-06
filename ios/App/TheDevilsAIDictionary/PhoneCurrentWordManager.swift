import Foundation
import OSLog

#if os(iOS)
import UIKit
import UserNotifications
#endif

#if os(iOS) && canImport(WatchConnectivity)
import WatchConnectivity
#endif

#if canImport(DevilsAIDictionaryCore)
import DevilsAIDictionaryCore
#endif

extension Notification.Name {
    static let currentWordDidChange = Notification.Name("CurrentWordDidChange")
    static let currentWordPendingNavigationDidChange = Notification.Name("CurrentWordPendingNavigationDidChange")
    static let currentWordPushStateDidChange = Notification.Name("CurrentWordPushStateDidChange")
    static let catalogSnapshotDidChange = Notification.Name("CatalogSnapshotDidChange")
}

@MainActor
final class PhoneCatalogManager {
    static let shared = PhoneCatalogManager()

    private let diskStore = CatalogDiskStore()
    private let updateClient = CatalogUpdateClient()
    private let logger = Logger(
        subsystem: "com.djngoma.devilsaidictionary",
        category: "PhoneCatalogManager"
    )
    private let refreshInterval: TimeInterval = 6 * 60 * 60

    private(set) var snapshot: DictionaryCatalogSnapshot?
    private(set) var refreshError: String?
    private(set) var isRefreshing = false
    private var configured = false

    private init() {}

    var lastCatalogCheckAt: Date? {
        diskStore.loadLastCheckAt()
    }

    var bundledCatalogVersion: String? {
        diskStore.loadLastBundledCatalogVersion()
    }

    var manifestURL: URL? {
        guard let baseURLString = Bundle.main.object(forInfoDictionaryKey: "MobileAPIBaseURL") as? String,
              let baseURL = URL(string: baseURLString) else {
            return nil
        }

        return baseURL
            .appendingPathComponent("mobile-catalog", isDirectory: true)
            .appendingPathComponent("manifest.json")
    }

    func configure() {
        guard !configured else {
            return
        }

        configured = true
        loadInitialSnapshot()
    }

    func refreshIfNeeded(force: Bool = false) async {
        guard configured, !isRefreshing else {
            return
        }

        if !force,
           let lastCheck = diskStore.loadLastCheckAt(),
           Date().timeIntervalSince(lastCheck) < refreshInterval {
            return
        }

        guard let baseURLString = Bundle.main.object(forInfoDictionaryKey: "MobileAPIBaseURL") as? String,
              let baseURL = URL(string: baseURLString) else {
            return
        }

        isRefreshing = true
        defer { isRefreshing = false }

        do {
            let manifest = try await updateClient.fetchManifest(baseURL: baseURL)
            diskStore.saveLastCheckAt(Date())

            guard manifest.schemaVersion <= DictionaryCatalogSnapshot.supportedSchemaVersion else {
                refreshError = "Catalog schema version \(manifest.schemaVersion) is not supported by this build."
                return
            }

            guard manifest.catalogVersion != snapshot?.version else {
                refreshError = nil
                return
            }

            let data = try await updateClient.fetchSnapshot(manifest: manifest, baseURL: baseURL)
            let updatedURL = try diskStore.replaceCatalog(with: data)
            let updatedSnapshot = try DictionaryCatalogSnapshot.load(from: data, sourceURL: updatedURL)

            guard updatedSnapshot.version == manifest.catalogVersion else {
                throw NSError(
                    domain: "PhoneCatalogManager",
                    code: 1,
                    userInfo: [
                        NSLocalizedDescriptionKey:
                            "Downloaded catalog version did not match the published manifest."
                    ]
                )
            }

            snapshot = updatedSnapshot
            refreshError = nil
            NotificationCenter.default.post(name: .catalogSnapshotDidChange, object: nil)
        } catch {
            logger.error("Catalog refresh failed: \(error.localizedDescription, privacy: .public)")
            refreshError = error.localizedDescription
        }
    }

    private func loadInitialSnapshot() {
        do {
            snapshot = try diskStore.loadPreferredSnapshot()
            refreshError = nil
        } catch {
            refreshError = error.localizedDescription
        }
    }
}

@MainActor
final class PhoneCurrentWordManager {
    static let shared = PhoneCurrentWordManager()

    private let storage = CurrentWordStorage()
    private let installationRegistrar = PushInstallationRegistrar()
    private lazy var watchSessionCoordinator = PhoneWatchSessionCoordinator()

    private var configured = false
    private var lastPushAuthorizationState: PushAuthorizationState
    private var catalogObserver: NSObjectProtocol?

    private init() {
        lastPushAuthorizationState = Self.defaultPushAuthorizationState
    }

    private static var defaultPushAuthorizationState: PushAuthorizationState {
        #if os(iOS)
        return .unknown
        #else
        return .unsupported
        #endif
    }

    private var supportsNativePush: Bool {
        #if os(iOS)
        return true
        #else
        return false
        #endif
    }

    func configureForCurrentPlatform() {
        guard !configured else {
            return
        }

        configured = true
        PhoneCatalogManager.shared.configure()
        observeCatalogUpdates()
        watchSessionCoordinator.activate()
        synchronizeWatchState()
        _ = ensureCurrentWord()

        #if os(iOS)
        UIApplication.shared.registerForRemoteNotifications()
        #endif

        Task {
            await PhoneCatalogManager.shared.refreshIfNeeded()
            if supportsNativePush {
                await refreshPushInstallation()
            }
            notifyPushStateChanged()
        }
    }

    func getState() -> [String: Any] {
        var state: [String: Any] = [
            "isNativePushAvailable": supportsNativePush,
            "pushAuthorizationStatus": lastPushAuthorizationState.rawValue,
            "pushTokenAvailable": supportsNativePush && storage.loadPushDeviceToken() != nil,
        ]

        if let currentWord = storage.loadCurrentWord() ?? ensureCurrentWord() {
            state["currentWord"] = currentWord.dictionaryRepresentation()
        }

        if let catalogSnapshot = PhoneCatalogManager.shared.snapshot {
            state["catalogVersion"] = catalogSnapshot.version
        }

        if let pendingNavigationPath = storage.loadPendingNavigationPath() {
            state["pendingNavigationPath"] = pendingNavigationPath
        }

        return state
    }

    func refreshCurrentWord() -> CurrentWordRecord? {
        guard let catalogSnapshot = PhoneCatalogManager.shared.snapshot,
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
        #if os(iOS)
        let center = UNUserNotificationCenter.current()
        _ = try await center.requestAuthorization(options: [.alert, .badge, .sound])
        UIApplication.shared.registerForRemoteNotifications()
        await refreshPushInstallation()
        notifyPushStateChanged()
        return getState()
        #else
        lastPushAuthorizationState = .unsupported
        notifyPushStateChanged()
        throw NSError(
            domain: "PhoneCurrentWordManager",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: "Push notifications are not wired for this Apple platform yet."]
        )
        #endif
    }

    func refreshDiagnosticsState() async {
        if supportsNativePush {
            _ = await currentPushAuthorizationStatus()
            await refreshPushInstallation()
        } else {
            lastPushAuthorizationState = .unsupported
        }

        notifyPushStateChanged()
    }

    func registerDeviceToken(_ deviceToken: Data) {
        guard supportsNativePush else {
            return
        }

        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        storage.savePushDeviceToken(token)
        Task {
            await refreshPushInstallation()
            notifyPushStateChanged()
        }
    }

    func handleRemoteNotificationResponse(userInfo: [AnyHashable: Any]) async {
        guard let slug = notificationSlug(from: userInfo) else {
            return
        }

        if let record = await resolveRecord(
            slug: slug,
            source: .notificationTap,
            forceRefreshIfMissing: true
        ) {
            persistCurrentWord(record)
        }

        setPendingNavigationPath("/dictionary/\(slug)")
    }

    func handleIncomingURL(_ url: URL) -> Bool {
        guard let slug = navigationSlug(for: url) else {
            return false
        }

        Task { @MainActor in
            if let record = await resolveRecord(
                slug: slug,
                source: .phoneSync,
                forceRefreshIfMissing: true
            ) {
                persistCurrentWord(record)
            }

            setPendingNavigationPath("/dictionary/\(slug)")
        }

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

    private func observeCatalogUpdates() {
        catalogObserver = NotificationCenter.default.addObserver(
            forName: .catalogSnapshotDidChange,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.handleCatalogSnapshotChange()
            }
        }
    }

    private func handleCatalogSnapshotChange() {
        if let currentWord = storage.loadCurrentWord(),
           let refreshed = refreshedRecord(
               slug: currentWord.slug,
               source: currentWord.source,
               updatedAt: currentWord.updatedAt
           ) {
            storage.saveCurrentWord(refreshed)
            NotificationCenter.default.post(name: .currentWordDidChange, object: nil)
        } else if storage.loadCurrentWord() != nil {
            _ = ensureCurrentWord()
        }

        synchronizeWatchState()
    }

    private func resolveRecord(
        slug: String,
        source: CurrentWordSource,
        forceRefreshIfMissing: Bool
    ) async -> CurrentWordRecord? {
        if let record = refreshedRecord(slug: slug, source: source) {
            return record
        }

        guard forceRefreshIfMissing else {
            return nil
        }

        await PhoneCatalogManager.shared.refreshIfNeeded(force: true)
        return refreshedRecord(slug: slug, source: source)
    }

    private func refreshedRecord(
        slug: String,
        source: CurrentWordSource,
        updatedAt: String? = nil
    ) -> CurrentWordRecord? {
        PhoneCatalogManager.shared.snapshot?.currentWord(
            slug: slug,
            source: source,
            updatedAt: updatedAt
        )
    }

    private func ensureCurrentWord() -> CurrentWordRecord? {
        if let currentWord = storage.loadCurrentWord(),
           refreshedRecord(
               slug: currentWord.slug,
               source: currentWord.source,
               updatedAt: currentWord.updatedAt
           ) != nil {
            return currentWord
        }

        guard let catalogSnapshot = PhoneCatalogManager.shared.snapshot,
              let seeded = catalogSnapshot.randomWord(excluding: nil, source: .seeded) else {
            return nil
        }

        persistCurrentWord(seeded)
        return seeded
    }

    private func persistCurrentWord(_ record: CurrentWordRecord) {
        storage.saveCurrentWord(record)
        synchronizeWatchState(currentWordOverride: record)
        NotificationCenter.default.post(name: .currentWordDidChange, object: nil)
    }

    private func synchronizeWatchState(currentWordOverride: CurrentWordRecord? = nil) {
        watchSessionCoordinator.synchronize(
            snapshot: PhoneCatalogManager.shared.snapshot,
            currentWord: currentWordOverride ?? storage.loadCurrentWord()
        )
    }

    private func setPendingNavigationPath(_ path: String) {
        storage.savePendingNavigationPath(path)
        NotificationCenter.default.post(name: .currentWordPendingNavigationDidChange, object: nil)
    }

    private func notifyPushStateChanged() {
        NotificationCenter.default.post(name: .currentWordPushStateDidChange, object: nil)
    }

    private func currentPushAuthorizationStatus() async -> PushAuthorizationState {
        guard supportsNativePush else {
            lastPushAuthorizationState = .unsupported
            return .unsupported
        }

        #if os(iOS)
        let settings = await notificationSettings()
        let state = PushAuthorizationState(status: settings.authorizationStatus)
        lastPushAuthorizationState = state
        return state
        #else
        lastPushAuthorizationState = .unsupported
        return .unsupported
        #endif
    }

    #if os(iOS)
    private func notificationSettings() async -> UNNotificationSettings {
        await withCheckedContinuation { continuation in
            UNUserNotificationCenter.current().getNotificationSettings { settings in
                continuation.resume(returning: settings)
            }
        }
    }
    #endif

    private func refreshPushInstallation() async {
        guard supportsNativePush else {
            lastPushAuthorizationState = .unsupported
            return
        }

        guard let token = storage.loadPushDeviceToken(),
              let baseURL = Bundle.main.object(forInfoDictionaryKey: "MobileAPIBaseURL") as? String,
              let url = URL(string: "\(baseURL)/api/mobile/push/installations") else {
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
            appVersion: {
                let short = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
                let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "0"
                return "\(short) (\(build))"
            }(),
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

    #if os(iOS)
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
    #endif
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

private final class PhoneWatchSessionCoordinator {
    #if os(iOS) && canImport(WatchConnectivity)
    private let session = WCSession.isSupported() ? WCSession.default : nil
    private lazy var delegateAdapter = WatchSessionDelegateAdapter(owner: self)
    private var pendingSnapshot: DictionaryCatalogSnapshot?
    private var pendingCurrentWord: CurrentWordRecord?
    private var transferredCatalogVersion: String?

    func activate() {
        guard let session else {
            return
        }

        session.delegate = delegateAdapter
        session.activate()
    }

    func synchronize(snapshot: DictionaryCatalogSnapshot?, currentWord: CurrentWordRecord?) {
        pendingSnapshot = snapshot
        pendingCurrentWord = currentWord
        flush()
    }

    fileprivate func flush() {
        guard let session,
              session.activationState == .activated,
              session.isPaired,
              session.isWatchAppInstalled else {
            return
        }

        if let snapshot = pendingSnapshot,
           let sourceURL = snapshot.sourceURL,
           transferredCatalogVersion != snapshot.version {
            session.transferFile(
                sourceURL,
                metadata: ["catalogVersion": snapshot.version]
            )
            transferredCatalogVersion = snapshot.version
        }

        guard let record = pendingCurrentWord,
              let catalogVersion = pendingSnapshot?.version else {
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

    private final class WatchSessionDelegateAdapter: NSObject, WCSessionDelegate {
        weak var owner: PhoneWatchSessionCoordinator?

        init(owner: PhoneWatchSessionCoordinator) {
            self.owner = owner
        }

        func sessionDidBecomeInactive(_ session: WCSession) {}

        func sessionDidDeactivate(_ session: WCSession) {
            session.activate()
        }

        func sessionWatchStateDidChange(_ session: WCSession) {
            owner?.flush()
        }

        func session(
            _ session: WCSession,
            activationDidCompleteWith activationState: WCSessionActivationState,
            error: Error?
        ) {
            owner?.flush()
        }
    }
    #else
    func activate() {}

    func synchronize(snapshot: DictionaryCatalogSnapshot?, currentWord: CurrentWordRecord?) {}
    #endif
}
