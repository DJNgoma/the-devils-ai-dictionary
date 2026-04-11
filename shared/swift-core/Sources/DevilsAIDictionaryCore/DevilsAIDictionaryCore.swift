import Foundation

public enum Difficulty: String, Codable, CaseIterable, Sendable {
    case beginner
    case intermediate
    case advanced
}

public enum TechnicalDepth: String, Codable, CaseIterable, Sendable {
    case low
    case medium
    case high
}

public enum HypeLevel: String, Codable, CaseIterable, Sendable {
    case low
    case medium
    case high
    case severe
}

public enum VendorFilter: String, Codable, CaseIterable, Sendable {
    case all
    case vendorOnly
    case nonVendorOnly
}

public struct Translation: Codable, Equatable, Sendable {
    public let label: String
    public let text: String
}

public struct BookmarkRecord: Codable, Equatable, Sendable {
    public let href: String
    public let title: String
    public let label: String
    public let description: String?
    public let savedAt: String

    public init(href: String, title: String, label: String, description: String? = nil, savedAt: String) {
        self.href = href
        self.title = title
        self.label = label
        self.description = description
        self.savedAt = savedAt
    }
}

public struct SavedWordRecord: Codable, Equatable, Sendable, Identifiable {
    public var id: String { slug }

    public let slug: String
    public let href: String
    public let title: String
    public let description: String?
    public let savedAt: String

    public init(
        slug: String,
        href: String,
        title: String,
        description: String? = nil,
        savedAt: String
    ) {
        self.slug = slug
        self.href = href
        self.title = title
        self.description = description
        self.savedAt = savedAt
    }

    public init(entry: Entry, savedAt: String) {
        self.init(
            slug: entry.slug,
            href: entry.url,
            title: entry.title,
            description: entry.devilDefinition.trimmingCharacters(in: .whitespacesAndNewlines),
            savedAt: savedAt
        )
    }

    public var bookmarkRecord: BookmarkRecord {
        BookmarkRecord(
            href: href,
            title: title,
            label: "Saved word",
            description: description,
            savedAt: savedAt
        )
    }
}

public enum CurrentWordSource: String, Codable, CaseIterable, Sendable {
    case seeded
    case manualRefresh
    case notificationTap
    case phoneSync
}

public struct CurrentWordRecord: Codable, Equatable, Sendable {
    public let slug: String
    public let title: String
    public let devilDefinition: String
    public let plainDefinition: String
    public let warningLabel: String?
    public let updatedAt: String
    public let source: CurrentWordSource

    public init(
        slug: String,
        title: String,
        devilDefinition: String,
        plainDefinition: String,
        warningLabel: String? = nil,
        updatedAt: String,
        source: CurrentWordSource
    ) {
        self.slug = slug
        self.title = title
        self.devilDefinition = devilDefinition
        self.plainDefinition = plainDefinition
        self.warningLabel = warningLabel
        self.updatedAt = updatedAt
        self.source = source
    }

    public init(entry: Entry, updatedAt: String, source: CurrentWordSource) {
        self.init(
            slug: entry.slug,
            title: entry.title,
            devilDefinition: entry.devilDefinition,
            plainDefinition: entry.plainDefinition,
            warningLabel: entry.warningLabel,
            updatedAt: updatedAt,
            source: source
        )
    }
}

public struct CurrentWordSyncPayload: Codable, Equatable, Sendable {
    public let catalogVersion: String
    public let currentWord: CurrentWordRecord

    public init(catalogVersion: String, currentWord: CurrentWordRecord) {
        self.catalogVersion = catalogVersion
        self.currentWord = currentWord
    }

    public func isCompatible(with catalogVersion: String) -> Bool {
        self.catalogVersion == catalogVersion
    }
}

public enum PendingDictionaryNavigationAction: Equatable, Sendable {
    case waitForCatalog
    case clearPendingPath
    case routeToEntry(String)
}

private let supportedDictionaryHosts: Set<String> = [
    "thedevilsaidictionary.com",
    "www.thedevilsaidictionary.com",
]

public func slugFromDictionaryPath(_ path: String?) -> String? {
    let trimmed = (path ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    guard trimmed.hasPrefix("/dictionary/") else {
        return nil
    }

    let slug = trimmed
        .replacingOccurrences(of: "/dictionary/", with: "", options: [.anchored])
        .trimmingCharacters(in: CharacterSet(charactersIn: "/"))

    guard !slug.isEmpty, !slug.contains("/") else {
        return nil
    }

    return slug
}

public func dictionarySlugFromLink(
    scheme: String?,
    host: String?,
    path: String?,
    directSlug: String? = nil
) -> String? {
    switch scheme?.lowercased() {
    case "devilsaidictionary":
        let normalizedHost = host?.lowercased()
        let candidate = normalizedHost == "dictionary" ? directSlug : nil

        if let candidate,
           !candidate.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return candidate
        }

        return slugFromDictionaryPath(path)
    case "https":
        guard let normalizedHost = host?.lowercased(),
              supportedDictionaryHosts.contains(normalizedHost) else {
            return nil
        }

        return slugFromDictionaryPath(path)
    default:
        return nil
    }
}

public func resolvePendingDictionaryNavigation(
    path: String?,
    hasLoadedCatalog: Bool,
    hasLoadError: Bool
) -> PendingDictionaryNavigationAction {
    guard let slug = slugFromDictionaryPath(path) else {
        return .clearPendingPath
    }

    guard hasLoadedCatalog || hasLoadError else {
        return .waitForCatalog
    }

    return .routeToEntry(slug)
}

public struct Entry: Codable, Equatable, Sendable {
    public let title: String
    public let slug: String
    public let letter: String
    public let categories: [String]
    public let aliases: [String]
    public let devilDefinition: String
    public let plainDefinition: String
    public let whyExists: String
    public let misuse: String
    public let practicalMeaning: String
    public let example: String
    public let askNext: [String]
    public let related: [String]
    public let seeAlso: [String]
    public let difficulty: Difficulty
    public let technicalDepth: TechnicalDepth
    public let hypeLevel: HypeLevel
    public let isVendorTerm: Bool
    public let publishedAt: String
    public let updatedAt: String
    public let warningLabel: String?
    public let vendorReferences: [String]
    public let note: String?
    public let tags: [String]
    public let misunderstoodScore: Int
    public let translations: [Translation]
    public let diagram: String?
    public let body: String
    public let categorySlugs: [String]
    public let url: String
    public let searchText: String?
    public let relatedSlugs: [String]
}

public struct LetterStat: Codable, Equatable, Sendable {
    public let letter: String
    public let count: Int
    public let href: String
}

public struct CategoryStat: Codable, Equatable, Sendable {
    public let title: String
    public let description: String
    public let slug: String
    public let count: Int
    public let sampleTerms: [String]
}

public struct EntryFilter: Equatable, Sendable {
    public let categorySlug: String?
    public let difficulty: Difficulty?
    public let technicalDepth: TechnicalDepth?
    public let vendorFilter: VendorFilter
    public let letter: String?

    public init(
        categorySlug: String? = nil,
        difficulty: Difficulty? = nil,
        technicalDepth: TechnicalDepth? = nil,
        vendorFilter: VendorFilter = .all,
        letter: String? = nil
    ) {
        self.categorySlug = categorySlug
        self.difficulty = difficulty
        self.technicalDepth = technicalDepth
        self.vendorFilter = vendorFilter
        self.letter = EntryFilter.normalizeLetter(letter)
    }

    static func normalizeLetter(_ value: String?) -> String? {
        guard let value else {
            return nil
        }

        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            return nil
        }

        return String(trimmed.prefix(1)).uppercased()
    }
}

public struct DictionaryCatalog: Codable, Equatable, Sendable {
    public let entries: [Entry]
    public let recentSlugs: [String]
    public let misunderstoodSlugs: [String]
    public let letterStats: [LetterStat]
    public let categoryStats: [CategoryStat]
    public let editorialTimeZone: String
    public let dailyWordStartDate: String
    public let dailyWordSlugs: [String]
    public let featuredSlug: String
    public let latestPublishedAt: String

    private static let defaultEditorialTimeZone = "Africa/Johannesburg"

    private enum CodingKeys: String, CodingKey {
        case entries
        case recentSlugs
        case misunderstoodSlugs
        case letterStats
        case categoryStats
        case editorialTimeZone
        case dailyWordStartDate
        case dailyWordSlugs
        case featuredSlug
        case latestPublishedAt
    }

    public static func decode(from data: Data) throws -> DictionaryCatalog {
        try JSONDecoder().decode(DictionaryCatalog.self, from: data)
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.entries = try container.decode([Entry].self, forKey: .entries)
        self.recentSlugs = try container.decode([String].self, forKey: .recentSlugs)
        self.misunderstoodSlugs = try container.decode([String].self, forKey: .misunderstoodSlugs)
        self.letterStats = try container.decode([LetterStat].self, forKey: .letterStats)
        self.categoryStats = try container.decode([CategoryStat].self, forKey: .categoryStats)
        self.editorialTimeZone = try container.decodeIfPresent(String.self, forKey: .editorialTimeZone)
            ?? Self.defaultEditorialTimeZone
        self.dailyWordStartDate = try container.decode(String.self, forKey: .dailyWordStartDate)
        self.dailyWordSlugs = try container.decode([String].self, forKey: .dailyWordSlugs)
        self.featuredSlug = try container.decode(String.self, forKey: .featuredSlug)
        self.latestPublishedAt = try container.decode(String.self, forKey: .latestPublishedAt)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(entries, forKey: .entries)
        try container.encode(recentSlugs, forKey: .recentSlugs)
        try container.encode(misunderstoodSlugs, forKey: .misunderstoodSlugs)
        try container.encode(letterStats, forKey: .letterStats)
        try container.encode(categoryStats, forKey: .categoryStats)
        try container.encode(editorialTimeZone, forKey: .editorialTimeZone)
        try container.encode(dailyWordStartDate, forKey: .dailyWordStartDate)
        try container.encode(dailyWordSlugs, forKey: .dailyWordSlugs)
        try container.encode(featuredSlug, forKey: .featuredSlug)
        try container.encode(latestPublishedAt, forKey: .latestPublishedAt)
    }

    public func entry(slug: String) -> Entry? {
        entries.first { $0.slug == slug }
    }

    public func featuredEntry(on referenceDate: Date = Date()) -> Entry? {
        guard let slug = resolvedFeaturedSlug(on: referenceDate) else {
            return nil
        }

        return entry(slug: slug)
    }

    public func dailyWord(on referenceDate: Date = Date()) -> Entry? {
        guard let slug = dailyWordSlug(on: referenceDate) else {
            return nil
        }

        return entry(slug: slug)
    }

    public func dailyWordSlug(on referenceDate: Date = Date()) -> String? {
        guard !dailyWordSlugs.isEmpty else {
            return nil
        }

        let timeZone = TimeZone(identifier: editorialTimeZone) ?? TimeZone(secondsFromGMT: 0)!
        let currentDay = Self.editorialDayNumber(for: referenceDate, timeZone: timeZone)
        let startDay = Self.dayNumber(forISODate: dailyWordStartDate) ?? currentDay
        let elapsedDays = max(0, currentDay - startDay)

        return dailyWordSlugs[elapsedDays % dailyWordSlugs.count]
    }

    public func resolvedFeaturedSlug(on referenceDate: Date = Date()) -> String? {
        let todaySlug = dailyWordSlug(on: referenceDate)
        let candidates = recentSlugs.filter { $0 != todaySlug }

        if candidates.isEmpty {
            return todaySlug ?? featuredSlug
        }

        let timeZone = TimeZone(identifier: editorialTimeZone) ?? TimeZone(secondsFromGMT: 0)!
        let currentDay = Self.editorialDayNumber(for: referenceDate, timeZone: timeZone)
        let startDay = Self.dayNumber(forISODate: dailyWordStartDate) ?? currentDay
        let elapsedDays = max(0, currentDay - startDay)
        let elapsedWeeks = elapsedDays / 7

        return candidates[elapsedWeeks % candidates.count]
    }

    public func randomEntry(excluding excludedSlug: String? = nil) -> Entry? {
        let candidates = entries.filter { entry in
            guard let excludedSlug else {
                return true
            }

            return entry.slug != excludedSlug
        }

        guard !candidates.isEmpty else {
            return nil
        }

        let index = Int.random(in: 0..<candidates.count)
        return candidates[index]
    }

    public func recentEntries(limit: Int = 4) -> [Entry] {
        entries(for: Array(recentSlugs.prefix(limit)))
    }

    public func misunderstoodEntries(limit: Int = 4) -> [Entry] {
        entries(for: Array(misunderstoodSlugs.prefix(limit)))
    }

    public func entries(for slugs: [String]) -> [Entry] {
        let map = Dictionary(uniqueKeysWithValues: entries.map { ($0.slug, $0) })
        return slugs.compactMap { map[$0] }
    }

    public func entries(matching filter: EntryFilter = EntryFilter()) -> [Entry] {
        entries.filter { entry in
            if let categorySlug = filter.categorySlug, !entry.categorySlugs.contains(categorySlug) {
                return false
            }

            if let difficulty = filter.difficulty, entry.difficulty != difficulty {
                return false
            }

            if let technicalDepth = filter.technicalDepth, entry.technicalDepth != technicalDepth {
                return false
            }

            switch filter.vendorFilter {
            case .all:
                break
            case .vendorOnly:
                guard entry.isVendorTerm else {
                    return false
                }
            case .nonVendorOnly:
                guard !entry.isVendorTerm else {
                    return false
                }
            }

            if let letter = filter.letter, entry.letter != letter {
                return false
            }

            return true
        }
    }

    private static func editorialDayNumber(for referenceDate: Date, timeZone: TimeZone) -> Int {
        var editorialCalendar = Calendar(identifier: .gregorian)
        editorialCalendar.timeZone = timeZone

        let components = editorialCalendar.dateComponents([.year, .month, .day], from: referenceDate)
        return dayNumber(
            year: components.year,
            month: components.month,
            day: components.day
        ) ?? 0
    }

    private static func dayNumber(forISODate value: String) -> Int? {
        let components = value.split(separator: "-").compactMap { Int($0) }
        guard components.count == 3 else {
            return nil
        }

        return dayNumber(
            year: components[0],
            month: components[1],
            day: components[2]
        )
    }

    private static func dayNumber(year: Int?, month: Int?, day: Int?) -> Int? {
        guard let year, let month, let day else {
            return nil
        }

        var utcCalendar = Calendar(identifier: .gregorian)
        utcCalendar.timeZone = TimeZone(secondsFromGMT: 0)!

        let dateComponents = DateComponents(
            timeZone: utcCalendar.timeZone,
            year: year,
            month: month,
            day: day
        )
        guard let date = utcCalendar.date(from: dateComponents) else {
            return nil
        }

        return Int(date.timeIntervalSince1970 / 86_400)
    }
}
