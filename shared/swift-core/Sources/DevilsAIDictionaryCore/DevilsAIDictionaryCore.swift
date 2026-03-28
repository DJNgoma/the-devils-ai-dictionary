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
    public let searchText: String
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
    public let featuredSlug: String

    public static func decode(from data: Data) throws -> DictionaryCatalog {
        try JSONDecoder().decode(DictionaryCatalog.self, from: data)
    }

    public func entry(slug: String) -> Entry? {
        entries.first { $0.slug == slug }
    }

    public func featuredEntry() -> Entry? {
        entry(slug: featuredSlug)
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
}
