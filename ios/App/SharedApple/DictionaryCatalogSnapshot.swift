import CryptoKit
import Foundation

#if canImport(DevilsAIDictionaryCore)
import DevilsAIDictionaryCore
#endif

struct DictionaryCatalogSnapshot {
    static let supportedSchemaVersion = 1

    let catalog: DictionaryCatalog
    let version: String
    let schemaVersion: Int
    let sourceURL: URL?

    static func load(from bundle: Bundle = .main) throws -> DictionaryCatalogSnapshot {
        guard let url = bundle.url(forResource: "entries.generated", withExtension: "json") else {
            throw NSError(
                domain: "DictionaryCatalogSnapshot",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Bundled catalog resource was not found."]
            )
        }

        return try load(from: url)
    }

    static func load(from url: URL) throws -> DictionaryCatalogSnapshot {
        let data = try Data(contentsOf: url)
        return try load(from: data, sourceURL: url)
    }

    static func load(from data: Data, sourceURL: URL? = nil) throws -> DictionaryCatalogSnapshot {
        let metadata = try metadata(from: data)
        guard metadata.schemaVersion <= supportedSchemaVersion else {
            throw NSError(
                domain: "DictionaryCatalogSnapshot",
                code: 2,
                userInfo: [
                    NSLocalizedDescriptionKey:
                        "Catalog schema version \(metadata.schemaVersion) is not supported by this build."
                ]
            )
        }

        let catalog = try DictionaryCatalog.decode(from: data)

        return DictionaryCatalogSnapshot(
            catalog: catalog,
            version: metadata.catalogVersion,
            schemaVersion: metadata.schemaVersion,
            sourceURL: sourceURL
        )
    }

    static func metadata(from data: Data) throws -> (schemaVersion: Int, catalogVersion: String) {
        let rawObject = try JSONSerialization.jsonObject(with: data)
        guard let root = rawObject as? [String: Any] else {
            throw NSError(
                domain: "DictionaryCatalogSnapshot",
                code: 3,
                userInfo: [NSLocalizedDescriptionKey: "Catalog root must be a JSON object."]
            )
        }

        let schemaVersion = root["schemaVersion"] as? Int ?? 0
        let catalogVersion = (root["catalogVersion"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
        let version = catalogVersion?.isEmpty == false ? catalogVersion! : sha256Hex(data)

        return (schemaVersion, version)
    }

    static func sha256Hex(_ data: Data) -> String {
        SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
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

struct CatalogManifest: Decodable {
    let schemaVersion: Int
    let catalogVersion: String
    let entryCount: Int
    let latestPublishedAt: String
    let publishedAt: String
    let snapshotPath: String
    let sha256: String
    let bytes: Int
}

struct CatalogDiskStore {
    private enum Keys {
        static let lastCatalogCheckAt = "catalog-last-check-at"
        static let lastBundledCatalogVersion = "catalog-last-bundled-version"
    }

    private let bundle: Bundle
    private let defaults: UserDefaults
    private let fileManager: FileManager

    init(
        bundle: Bundle = .main,
        defaults: UserDefaults = .standard,
        fileManager: FileManager = .default
    ) {
        self.bundle = bundle
        self.defaults = defaults
        self.fileManager = fileManager
    }

    func loadPreferredSnapshot() throws -> DictionaryCatalogSnapshot {
        let url = try ensureSeededCatalog()
        return try DictionaryCatalogSnapshot.load(from: url)
    }

    func ensureSeededCatalog() throws -> URL {
        guard let bundleURL = bundle.url(forResource: "entries.generated", withExtension: "json") else {
            throw NSError(
                domain: "CatalogDiskStore",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Bundled catalog resource was not found."]
            )
        }
        let bundleData = try Data(contentsOf: bundleURL)
        let bundleMetadata = try DictionaryCatalogSnapshot.metadata(from: bundleData)
        let targetURL = try cachedCatalogURL()

        try fileManager.createDirectory(
            at: targetURL.deletingLastPathComponent(),
            withIntermediateDirectories: true,
            attributes: nil
        )

        if fileManager.fileExists(atPath: targetURL.path) {
            if let cachedData = try? Data(contentsOf: targetURL),
               let cachedMetadata = try? DictionaryCatalogSnapshot.metadata(from: cachedData) {
                let lastBundledCatalogVersion = loadLastBundledCatalogVersion()
                saveLastBundledCatalogVersion(bundleMetadata.catalogVersion)

                if cachedMetadata.catalogVersion == bundleMetadata.catalogVersion {
                    return targetURL
                }

                if let lastBundledCatalogVersion,
                   lastBundledCatalogVersion != bundleMetadata.catalogVersion,
                   cachedMetadata.catalogVersion == lastBundledCatalogVersion {
                    return try replaceCatalog(with: bundleData)
                }

                return targetURL
            }

            try? fileManager.removeItem(at: targetURL)
        }

        let seededURL = try replaceCatalog(with: bundleData)
        saveLastBundledCatalogVersion(bundleMetadata.catalogVersion)

        return seededURL
    }

    func replaceCatalog(with data: Data) throws -> URL {
        let targetURL = try cachedCatalogURL()
        let directoryURL = targetURL.deletingLastPathComponent()
        let tempURL = directoryURL.appendingPathComponent("\(UUID().uuidString).json")

        try fileManager.createDirectory(
            at: directoryURL,
            withIntermediateDirectories: true,
            attributes: nil
        )
        try data.write(to: tempURL, options: .atomic)

        if fileManager.fileExists(atPath: targetURL.path) {
            try fileManager.removeItem(at: targetURL)
        }

        try fileManager.moveItem(at: tempURL, to: targetURL)

        return targetURL
    }

    func loadLastCheckAt() -> Date? {
        defaults.object(forKey: Keys.lastCatalogCheckAt) as? Date
    }

    func saveLastCheckAt(_ date: Date) {
        defaults.set(date, forKey: Keys.lastCatalogCheckAt)
    }

    func loadLastBundledCatalogVersion() -> String? {
        defaults.string(forKey: Keys.lastBundledCatalogVersion)
    }

    func saveLastBundledCatalogVersion(_ version: String) {
        defaults.set(version, forKey: Keys.lastBundledCatalogVersion)
    }

    private func cachedCatalogURL() throws -> URL {
        let baseURL = try fileManager.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )

        return baseURL
            .appendingPathComponent("Catalog", isDirectory: true)
            .appendingPathComponent("entries.generated.json")
    }
}

actor CatalogUpdateClient {
    private let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    func fetchManifest(baseURL: URL) async throws -> CatalogManifest {
        let manifestURL = baseURL
            .appendingPathComponent("mobile-catalog", isDirectory: true)
            .appendingPathComponent("manifest.json")
        let (data, response) = try await session.data(from: manifestURL)
        try validate(response: response, description: "manifest")

        return try JSONDecoder().decode(CatalogManifest.self, from: data)
    }

    func fetchSnapshot(manifest: CatalogManifest, baseURL: URL) async throws -> Data {
        let snapshotURL = URL(string: manifest.snapshotPath, relativeTo: baseURL) ?? baseURL
        let (data, response) = try await session.data(from: snapshotURL)
        try validate(response: response, description: "catalog snapshot")

        let digest = DictionaryCatalogSnapshot.sha256Hex(data)
        guard digest == manifest.sha256 else {
            throw NSError(
                domain: "CatalogUpdateClient",
                code: 1,
                userInfo: [
                    NSLocalizedDescriptionKey:
                        "Downloaded catalog snapshot did not match the published SHA-256."
                ]
            )
        }

        return data
    }

    private func validate(response: URLResponse, description: String) throws {
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw NSError(
                domain: "CatalogUpdateClient",
                code: 2,
                userInfo: [NSLocalizedDescriptionKey: "The \(description) request failed."]
            )
        }
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
