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
    private lazy var watchSessionCoordinator = PhoneWatchSessionCoordinator()
    private let logger = Logger(
        subsystem: "com.djngoma.devilsaidictionary",
        category: "PhoneCurrentWordManager"
    )

    private var configured = false
    private var lastPushAuthorizationState: PushAuthorizationState
    private var catalogObserver: NSObjectProtocol?
    private var pushSystemObserverTokens: [NSObjectProtocol] = []
    private var scheduledLocalNotificationCount = 0

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
        observePushSystemChanges()
        watchSessionCoordinator.activate()
        synchronizeWatchState()
        _ = ensureCurrentWord()

        Task {
            await PhoneCatalogManager.shared.refreshIfNeeded()
            await reconcileLocalNotifications()
            notifyPushStateChanged()
        }
    }

    func getState() -> [String: Any] {
        let pushPreferenceEnabled = pushNotificationsPreferenceEnabled(for: lastPushAuthorizationState)
        var state: [String: Any] = [
            "isNativePushAvailable": supportsNativePush,
            "pushAuthorizationStatus": lastPushAuthorizationState.rawValue,
            "pushNotificationsPreferenceEnabled": pushPreferenceEnabled,
            "pushNotificationsPreferenceConfigured":
                storage.loadPushNotificationsPreferenceEnabled() != nil,
            "pushPreferredDeliveryHour": storage.loadPushPreferredDeliveryHour(),
            "pushScheduledNotificationCount": scheduledLocalNotificationCount,
        ]

        if let schedule = storage.loadPushLocalNotificationSchedule() {
            state["pushScheduledCatalogVersion"] = schedule.catalogVersion
            state["pushScheduledTimeZone"] = schedule.timeZoneIdentifier
            state["pushNextScheduledFireAt"] = schedule.nextScheduledFireAt
        }

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
        storage.savePushNotificationsPreferenceEnabled(true)
        let center = UNUserNotificationCenter.current()
        _ = try await center.requestAuthorization(options: [.alert, .badge, .sound])
        await reconcileLocalNotifications(forceRebuild: true)
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
            await reconcileLocalNotifications()
        } else {
            lastPushAuthorizationState = .unsupported
        }

        notifyPushStateChanged()
    }

    func setPushNotificationsEnabled(_ enabled: Bool) async throws -> [String: Any] {
        guard supportsNativePush else {
            lastPushAuthorizationState = .unsupported
            notifyPushStateChanged()
            throw NSError(
                domain: "PhoneCurrentWordManager",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Push notifications are not wired for this Apple platform yet."]
            )
        }

        storage.savePushNotificationsPreferenceEnabled(enabled)

        if enabled {
            let status = await currentPushAuthorizationStatus()
            if status == .notDetermined || status == .unknown {
                return try await requestPushAuthorization()
            }
        }

        await reconcileLocalNotifications(forceRebuild: true)
        notifyPushStateChanged()
        return getState()
    }

    func setPushPreferredDeliveryHour(_ hour: Int) async -> [String: Any] {
        storage.savePushPreferredDeliveryHour(hour)

        if supportsNativePush {
            await reconcileLocalNotifications(forceRebuild: true)
        } else {
            lastPushAuthorizationState = .unsupported
        }

        notifyPushStateChanged()
        return getState()
    }

    func handleNotificationResponse(userInfo: [AnyHashable: Any]) async {
        guard let slug = notificationSlug(from: userInfo) else {
            return
        }

        if let record = await resolveRecord(
            slug: slug,
            source: notificationSource(from: userInfo),
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

    private func observePushSystemChanges() {
        #if os(iOS)
        guard pushSystemObserverTokens.isEmpty else {
            return
        }

        let center = NotificationCenter.default
        for name in [
            UIApplication.significantTimeChangeNotification,
            .NSCalendarDayChanged,
            .NSSystemTimeZoneDidChange,
        ] {
            let token = center.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                Task { @MainActor in
                    guard let self else {
                        return
                    }

                    await self.reconcileLocalNotifications(forceRebuild: true)
                    self.notifyPushStateChanged()
                }
            }
            pushSystemObserverTokens.append(token)
        }
        #endif
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

        Task { @MainActor in
            await reconcileLocalNotifications(forceRebuild: true)
            notifyPushStateChanged()
        }
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

    private func reconcileLocalNotifications(forceRebuild: Bool = false) async {
        guard supportsNativePush else {
            lastPushAuthorizationState = .unsupported
            scheduledLocalNotificationCount = 0
            storage.savePushLocalNotificationSchedule(nil)
            return
        }

        #if os(iOS)
        let status = await currentPushAuthorizationStatus()
        guard status.canDeliver, pushNotificationsPreferenceEnabled(for: status) else {
            await clearLocalNotifications()
            return
        }

        let center = UNUserNotificationCenter.current()
        guard let snapshot = PhoneCatalogManager.shared.snapshot,
              let plan = LocalNotificationSchedulePlan(
                  snapshot: snapshot,
                  preferredDeliveryHour: storage.loadPushPreferredDeliveryHour(),
                  deviceTimeZone: .current
              ) else {
            let pendingRequests = await center.pendingNotificationRequests()
            let pendingLocalRequests = LocalNotificationSchedulePlan.localRequests(from: pendingRequests)
            scheduledLocalNotificationCount = pendingLocalRequests.count
            if pendingLocalRequests.isEmpty {
                storage.savePushLocalNotificationSchedule(nil)
            }
            return
        }

        let pendingRequests = await center.pendingNotificationRequests()
        let pendingLocalRequests = LocalNotificationSchedulePlan.localRequests(from: pendingRequests)
        let pendingIdentifiers = Set(pendingLocalRequests.map(\.identifier))
        let plannedIdentifiers = Set(plan.requests.map(\.identifier))
        let storedSchedule = storage.loadPushLocalNotificationSchedule()

        if !forceRebuild,
           storedSchedule == plan.metadata,
           pendingLocalRequests.count == plan.requests.count,
           pendingIdentifiers == plannedIdentifiers {
            scheduledLocalNotificationCount = pendingLocalRequests.count
            return
        }

        center.removePendingNotificationRequests(withIdentifiers: pendingLocalRequests.map(\.identifier))

        var addedRequests = 0
        for request in plan.requests {
            do {
                try await center.addRequest(request)
                addedRequests += 1
            } catch {
                logger.error(
                    "Failed to add local daily notification \(request.identifier, privacy: .public): \(error.localizedDescription, privacy: .public)"
                )
            }
        }

        scheduledLocalNotificationCount = addedRequests

        if addedRequests == plan.requests.count {
            storage.savePushLocalNotificationSchedule(plan.metadata)
            return
        }

        storage.savePushLocalNotificationSchedule(nil)
        logger.error(
            "Local daily notification rebuild completed with \(addedRequests, privacy: .public) of \(plan.requests.count, privacy: .public) requests queued."
        )
        #endif
    }

    private func clearLocalNotifications() async {
        #if os(iOS)
        let center = UNUserNotificationCenter.current()
        let pendingRequests = await center.pendingNotificationRequests()
        let localIdentifiers = LocalNotificationSchedulePlan.localRequests(from: pendingRequests).map(\.identifier)
        if !localIdentifiers.isEmpty {
            center.removePendingNotificationRequests(withIdentifiers: localIdentifiers)
        }
        #endif

        scheduledLocalNotificationCount = 0
        storage.savePushLocalNotificationSchedule(nil)
    }

    private func pushNotificationsPreferenceEnabled(
        for status: PushAuthorizationState
    ) -> Bool {
        if let storedValue = storage.loadPushNotificationsPreferenceEnabled() {
            return storedValue
        }

        return status.canDeliver
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

    private func notificationSource(from userInfo: [AnyHashable: Any]) -> CurrentWordSource {
        if let rawValue = userInfo["source"] as? String,
           let source = CurrentWordSource(rawValue: rawValue) {
            return source
        }

        return .notificationTap
    }

    private func navigationSlug(for url: URL) -> String? {
        dictionarySlugFromLink(
            scheme: url.scheme,
            host: url.host,
            path: url.path,
            directSlug: url.pathComponents.filter { $0 != "/" }.first
        )
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

    var canDeliver: Bool {
        switch self {
        case .authorized, .ephemeral, .provisional:
            return true
        case .denied, .notDetermined, .unsupported, .unknown:
            return false
        }
    }
}

#if os(iOS)
private struct LocalNotificationSchedulePlan {
    static let horizon = 60
    static let identifierPrefix = "daily-word-local-"

    let metadata: PushLocalNotificationScheduleMetadata
    let requests: [UNNotificationRequest]

    init?(
        snapshot: DictionaryCatalogSnapshot,
        preferredDeliveryHour: Int,
        deviceTimeZone: TimeZone,
        now: Date = Date()
    ) {
        let fireDates = Self.fireDates(
            preferredDeliveryHour: preferredDeliveryHour,
            deviceTimeZone: deviceTimeZone,
            now: now
        )

        guard let nextFireDate = fireDates.first else {
            return nil
        }

        metadata = PushLocalNotificationScheduleMetadata(
            catalogVersion: snapshot.version,
            preferredDeliveryHour: preferredDeliveryHour,
            timeZoneIdentifier: deviceTimeZone.identifier,
            nextScheduledFireAt: nextFireDate
        )

        let editorialTimeZone = TimeZone(identifier: snapshot.catalog.editorialTimeZone) ?? TimeZone(secondsFromGMT: 0)!
        requests = fireDates.compactMap { fireDate in
            guard let slug = snapshot.catalog.dailyWordSlug(on: fireDate),
                  let entry = snapshot.catalog.entry(slug: slug) else {
                return nil
            }

            let editorialDateKey = Self.editorialDateKey(for: fireDate, timeZone: editorialTimeZone)
            let content = UNMutableNotificationContent()
            content.title = entry.title
            content.body = entry.devilDefinition
                .trimmingCharacters(in: .whitespacesAndNewlines)
                .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            content.sound = .default
            content.userInfo = [
                "slug": entry.slug,
                "source": CurrentWordSource.localNotification.rawValue,
                "editorialDateKey": editorialDateKey,
            ]

            var calendar = Calendar(identifier: .gregorian)
            calendar.timeZone = deviceTimeZone
            let components = calendar.dateComponents(
                [.year, .month, .day, .hour, .minute, .second],
                from: fireDate
            )
            let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)

            return UNNotificationRequest(
                identifier: Self.identifier(for: fireDate),
                content: content,
                trigger: trigger
            )
        }

        guard requests.count == fireDates.count else {
            return nil
        }
    }

    static func localRequests(from requests: [UNNotificationRequest]) -> [UNNotificationRequest] {
        requests.filter { $0.identifier.hasPrefix(identifierPrefix) }
    }

    private static func fireDates(
        preferredDeliveryHour: Int,
        deviceTimeZone: TimeZone,
        now: Date
    ) -> [Date] {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = deviceTimeZone

        let startOfToday = calendar.startOfDay(for: now)
        guard let todayFireDate = calendar.date(
            byAdding: DateComponents(hour: min(max(preferredDeliveryHour, 0), 23)),
            to: startOfToday
        ) else {
            return []
        }

        let firstFireDate = todayFireDate > now ? todayFireDate : calendar.date(byAdding: .day, value: 1, to: todayFireDate)
        guard let firstFireDate else {
            return []
        }

        return (0..<horizon).compactMap { offset in
            calendar.date(byAdding: .day, value: offset, to: firstFireDate)
        }
    }

    private static func identifier(for fireDate: Date) -> String {
        "\(identifierPrefix)\(SharedDateFormatter.iso8601.string(from: fireDate))"
    }

    private static func editorialDateKey(for date: Date, timeZone: TimeZone) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = timeZone
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}

private extension UNUserNotificationCenter {
    func pendingNotificationRequests() async -> [UNNotificationRequest] {
        await withCheckedContinuation { continuation in
            getPendingNotificationRequests { requests in
                continuation.resume(returning: requests)
            }
        }
    }

    func addRequest(_ request: UNNotificationRequest) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            add(request) { error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                continuation.resume()
            }
        }
    }
}
#endif

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
