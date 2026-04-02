import Foundation
import SwiftUI
import WatchConnectivity
import WatchKit

#if canImport(DevilsAIDictionaryCore)
import DevilsAIDictionaryCore
#endif

@MainActor
final class WatchCurrentWordModel: NSObject, ObservableObject {
    @Published private(set) var currentWord: CurrentWordRecord?
    @Published private(set) var loadError: String?

    private let storage = CurrentWordStorage()
    private let catalogStore = CatalogDiskStore()
    private var catalogSnapshot: DictionaryCatalogSnapshot?
    private lazy var sessionCoordinator = WatchCurrentWordSessionCoordinator(model: self)

    override init() {
        super.init()

        do {
            catalogSnapshot = try catalogStore.loadPreferredSnapshot()
            loadError = nil
        } catch {
            loadError = "The bundled catalog is missing."
        }

        currentWord = storage.loadCurrentWord()
        sessionCoordinator.activate()

        if let receivedContext = sessionCoordinator.receivedApplicationContext {
            apply(applicationContext: receivedContext)
        }
    }

    var featuredEntry: Entry? {
        catalogSnapshot?.catalog.featuredEntry()
    }

    var todayWord: Entry? {
        catalogSnapshot?.catalog.dailyWord()
    }

    var recentEntries: [Entry] {
        catalogSnapshot?.catalog.recentEntries(limit: 6) ?? []
    }

    var misunderstoodEntries: [Entry] {
        catalogSnapshot?.catalog.misunderstoodEntries(limit: 4) ?? []
    }

    func entry(slug: String) -> Entry? {
        catalogSnapshot?.catalog.entry(slug: slug)
    }

    func randomEntry() -> Entry? {
        catalogSnapshot?.catalog.randomEntry(excluding: todayWord?.slug)
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
