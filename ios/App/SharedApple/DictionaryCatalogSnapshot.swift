import CryptoKit
import Foundation

#if canImport(DevilsAIDictionaryCore)
import DevilsAIDictionaryCore
#endif

struct DictionaryCatalogSnapshot {
    let catalog: DictionaryCatalog
    let version: String

    static func load(from bundle: Bundle = .main) throws -> DictionaryCatalogSnapshot {
        guard let url = bundle.url(forResource: "entries.generated", withExtension: "json") else {
            throw NSError(
                domain: "DictionaryCatalogSnapshot",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Bundled catalog resource was not found."]
            )
        }

        let data = try Data(contentsOf: url)
        let catalog = try DictionaryCatalog.decode(from: data)
        let version = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()

        return DictionaryCatalogSnapshot(catalog: catalog, version: version)
    }

    func currentWord(slug: String, source: CurrentWordSource, updatedAt: String? = nil) -> CurrentWordRecord? {
        guard let entry = catalog.entry(slug: slug) else {
            return nil
        }

        return CurrentWordRecord(
            entry: entry,
            updatedAt: updatedAt ?? Self.timestamp(),
            source: source
        )
    }

    func randomWord(excluding excludedSlug: String?, source: CurrentWordSource) -> CurrentWordRecord? {
        guard let entry = catalog.randomEntry(excluding: excludedSlug) else {
            return nil
        }

        return CurrentWordRecord(entry: entry, updatedAt: Self.timestamp(), source: source)
    }

    static func timestamp() -> String {
        SharedDateFormatter.iso8601.string(from: Date())
    }
}

enum SharedDateFormatter {
    static let iso8601: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}

extension CurrentWordRecord {
    func dictionaryRepresentation() -> [String: Any] {
        var dictionary: [String: Any] = [
            "devilDefinition": devilDefinition,
            "plainDefinition": plainDefinition,
            "slug": slug,
            "source": source.rawValue,
            "title": title,
            "updatedAt": updatedAt,
        ]

        if let warningLabel {
            dictionary["warningLabel"] = warningLabel
        }

        return dictionary
    }
}

struct CurrentWordApplicationContext {
    static let catalogVersionKey = "catalogVersion"
    static let currentWordDataKey = "currentWordData"

    let payload: CurrentWordSyncPayload

    init(payload: CurrentWordSyncPayload) {
        self.payload = payload
    }

    init?(dictionary: [String: Any]) {
        guard let catalogVersion = dictionary[Self.catalogVersionKey] as? String,
              let currentWordData = dictionary[Self.currentWordDataKey] as? Data,
              let currentWord = try? JSONDecoder().decode(CurrentWordRecord.self, from: currentWordData)
        else {
            return nil
        }

        payload = CurrentWordSyncPayload(catalogVersion: catalogVersion, currentWord: currentWord)
    }

    func dictionaryRepresentation() throws -> [String: Any] {
        [
            Self.catalogVersionKey: payload.catalogVersion,
            Self.currentWordDataKey: try JSONEncoder().encode(payload.currentWord),
        ]
    }
}
