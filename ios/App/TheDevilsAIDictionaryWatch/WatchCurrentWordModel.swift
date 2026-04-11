import Foundation
import SwiftUI
import WatchConnectivity
import WatchKit

#if canImport(DevilsAIDictionaryCore)
import DevilsAIDictionaryCore
#endif

@MainActor
final class WatchCurrentWordModel: NSObject, ObservableObject {
    enum ScreenshotPreset: String {
        case home
        case entry

        private static let launchArgument = "-watch-screenshot-preset"

        static func current(arguments: [String] = ProcessInfo.processInfo.arguments) -> ScreenshotPreset? {
            guard let index = arguments.firstIndex(of: launchArgument),
                  arguments.indices.contains(index + 1) else {
                return nil
            }

            return ScreenshotPreset(rawValue: arguments[index + 1].lowercased())
        }
    }

    @Published private(set) var currentWord: CurrentWordRecord?
    @Published private(set) var loadError: String?

    private let storage = CurrentWordStorage()
    private let catalogStore = CatalogDiskStore()
    private var catalogSnapshot: DictionaryCatalogSnapshot?
    private lazy var sessionCoordinator = WatchCurrentWordSessionCoordinator(model: self)
    let screenshotPreset: ScreenshotPreset?

    override init() {
        screenshotPreset = ScreenshotPreset.current()
        super.init()

        do {
            catalogSnapshot = try catalogStore.loadPreferredSnapshot()
            loadError = nil
        } catch {
            loadError = "The bundled catalog is missing."
        }

        currentWord = storage.loadCurrentWord()
        if screenshotPreset == nil {
            sessionCoordinator.activate()

            if let receivedContext = sessionCoordinator.receivedApplicationContext {
                apply(applicationContext: receivedContext)
            }
        }
    }

    var featuredEntry: Entry? {
        catalogSnapshot?.catalog.featuredEntry()
    }

    var todayWord: Entry? {
        if screenshotPreset != nil {
            return preferredScreenshotEntry(
                candidates: ["agent", "clanker", "rag", "prompt-injection"]
            )
        }

        return catalogSnapshot?.catalog.dailyWord()
    }

    var recentEntries: [Entry] {
        if screenshotPreset != nil {
            return preferredScreenshotEntries(
                candidates: ["clanker", "agentic-ai", "vibe-coding", "prompt-injection", "rag", "alignment"],
                limit: 6,
                excluding: [todayWord?.slug]
            )
        }

        return catalogSnapshot?.catalog.recentEntries(limit: 6) ?? []
    }

    var misunderstoodEntries: [Entry] {
        if screenshotPreset != nil {
            return preferredScreenshotEntries(
                candidates: ["synthetic-data", "machine-learning", "deep-learning", "hallucination", "agent"],
                limit: 4,
                excluding: [todayWord?.slug] + recentEntries.map(\.slug)
            )
        }

        return catalogSnapshot?.catalog.misunderstoodEntries(limit: 4) ?? []
    }

    var screenshotNavigationSlug: String? {
        guard screenshotPreset == .entry else {
            return nil
        }

        return preferredScreenshotEntry(
            candidates: ["clanker", "agentic-ai", "agent", "prompt-injection"]
        )?.slug
    }

    func entry(slug: String) -> Entry? {
        catalogSnapshot?.catalog.entry(slug: slug)
    }

    func randomEntry() -> Entry? {
        if screenshotPreset != nil {
            return preferredScreenshotEntries(
                candidates: ["rag", "alignment", "hallucination", "synthetic-data", "deep-learning"],
                limit: 1,
                excluding: [todayWord?.slug] + recentEntries.map(\.slug) + misunderstoodEntries.map(\.slug)
            ).first
        }

        return catalogSnapshot?.catalog.randomEntry(excluding: todayWord?.slug)
    }

    func isTodayWord(_ entry: Entry) -> Bool {
        todayWord?.slug == entry.slug
    }

    func openOnPhone() {
        openOnPhone(slug: todayWord?.slug)
    }

    func openOnPhone(slug: String?) {
        guard let slug,
              let url = URL(string: "devilsaidictionary://dictionary/\(slug)") else {
            return
        }

        WKApplication.shared().openSystemURL(url)
    }

    func apply(applicationContext: [String: Any]) {
        guard let catalogSnapshot,
              let applicationContext = CurrentWordApplicationContext(dictionary: applicationContext),
              applicationContext.payload.isCompatible(with: catalogSnapshot.version),
              let synced = catalogSnapshot.currentWord(
                  slug: applicationContext.payload.currentWord.slug,
                  source: .phoneSync,
                  updatedAt: applicationContext.payload.currentWord.updatedAt
              ) else {
            return
        }

        apply(record: synced)
    }

    func applyCatalogTransfer(fileURL: URL, metadata: [String: Any]?) {
        do {
            let data = try Data(contentsOf: fileURL)
            let cachedURL = try catalogStore.replaceCatalog(with: data)
            let snapshot = try DictionaryCatalogSnapshot.load(from: data, sourceURL: cachedURL)

            if let metadataVersion = metadata?["catalogVersion"] as? String,
               metadataVersion != snapshot.version {
                return
            }

            catalogSnapshot = snapshot
            loadError = nil

            if let currentWord,
               let refreshed = snapshot.currentWord(
                   slug: currentWord.slug,
                   source: currentWord.source,
                   updatedAt: currentWord.updatedAt
               ) {
                apply(record: refreshed)
            }
        } catch {
            loadError = error.localizedDescription
        }
    }

    private func apply(record: CurrentWordRecord) {
        currentWord = record
        storage.saveCurrentWord(record)
    }

    private func preferredScreenshotEntry(candidates: [String]) -> Entry? {
        preferredScreenshotEntries(candidates: candidates, limit: 1).first
            ?? todayWord
            ?? catalogSnapshot?.catalog.entries.first
    }

    private func preferredScreenshotEntries(candidates: [String], limit: Int, excluding slugs: [String?] = []) -> [Entry] {
        guard let catalog = catalogSnapshot?.catalog else {
            return []
        }

        let excludedSlugs = Set(slugs.compactMap { $0 })
        var results: [Entry] = []
        var seenSlugs = excludedSlugs

        for slug in candidates {
            guard !seenSlugs.contains(slug),
                  let entry = catalog.entry(slug: slug) else {
                continue
            }

            results.append(entry)
            seenSlugs.insert(slug)

            if results.count == limit {
                return results
            }
        }

        for entry in catalog.entries where !seenSlugs.contains(entry.slug) {
            results.append(entry)
            seenSlugs.insert(entry.slug)

            if results.count == limit {
                break
            }
        }

        return results
    }
}

private final class WatchCurrentWordSessionCoordinator: NSObject, WCSessionDelegate {
    private weak var model: WatchCurrentWordModel?
    private let session = WCSession.isSupported() ? WCSession.default : nil

    init(model: WatchCurrentWordModel) {
        self.model = model
        super.init()
    }

    var receivedApplicationContext: [String: Any]? {
        guard let session else {
            return nil
        }

        return session.receivedApplicationContext.isEmpty ? nil : session.receivedApplicationContext
    }

    func activate() {
        guard let session else {
            return
        }

        session.delegate = self
        session.activate()
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        Task { @MainActor in
            model?.apply(applicationContext: applicationContext)
        }
    }

    func session(_ session: WCSession, didReceive file: WCSessionFile) {
        Task { @MainActor in
            model?.applyCatalogTransfer(fileURL: file.fileURL, metadata: file.metadata)
        }
    }
}
