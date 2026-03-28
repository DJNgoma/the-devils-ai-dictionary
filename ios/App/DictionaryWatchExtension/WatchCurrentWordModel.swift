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
    private let catalogSnapshot: DictionaryCatalogSnapshot?
    private lazy var sessionCoordinator = WatchCurrentWordSessionCoordinator(model: self)

    override init() {
        catalogSnapshot = try? DictionaryCatalogSnapshot.load()
        super.init()

        if catalogSnapshot == nil {
            loadError = "The bundled catalog is missing."
        }

        currentWord = storage.loadCurrentWord()
        sessionCoordinator.activate()

        if let receivedContext = sessionCoordinator.receivedApplicationContext {
            apply(applicationContext: receivedContext)
        }

        if currentWord == nil {
            seedInitialWord()
        }
    }

    func refresh() {
        guard let catalogSnapshot else {
            return
        }

        if let refreshed = catalogSnapshot.randomWord(
            excluding: currentWord?.slug,
            source: .manualRefresh
        ) {
            apply(record: refreshed)
        }
    }

    private func seedInitialWord() {
        guard let catalogSnapshot,
              let seeded = catalogSnapshot.randomWord(
                  excluding: nil,
                  source: .seeded
              )
        else {
            return
        }

        apply(record: seeded)
    }

    func openOnPhone() {
        guard let slug = currentWord?.slug,
              let url = URL(string: "devilsaidictionary://dictionary/\(slug)")
        else {
            return
        }

        WKExtension.shared().openSystemURL(url)
    }

    func apply(applicationContext: [String: Any]) {
        guard let catalogSnapshot,
              let applicationContext = CurrentWordApplicationContext(dictionary: applicationContext),
              applicationContext.payload.isCompatible(with: catalogSnapshot.version),
              let synced = catalogSnapshot.currentWord(
                  slug: applicationContext.payload.currentWord.slug,
                  source: .phoneSync,
                  updatedAt: applicationContext.payload.currentWord.updatedAt
              )
        else {
            return
        }

        apply(record: synced)
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
}
