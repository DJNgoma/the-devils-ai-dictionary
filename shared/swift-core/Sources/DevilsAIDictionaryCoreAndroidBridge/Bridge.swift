import DevilsAIDictionaryCore
import Foundation

// MARK: - Catalog lifecycle

@_cdecl("daid_catalog_decode")
public func catalogDecode(
    _ bytes: UnsafePointer<UInt8>,
    _ length: Int
) -> UnsafeMutableRawPointer? {
    let data = Data(bytes: bytes, count: length)
    guard let catalog = try? DictionaryCatalog.decode(from: data) else {
        return nil
    }

    return Unmanaged.passRetained(CatalogBox(catalog)).toOpaque()
}

@_cdecl("daid_catalog_free")
public func catalogFree(_ handle: UnsafeMutableRawPointer) {
    Unmanaged<CatalogBox>.fromOpaque(handle).release()
}

// MARK: - Single entry lookups

@_cdecl("daid_catalog_entry_json")
public func catalogEntryJSON(
    _ handle: UnsafeMutableRawPointer,
    _ slug: UnsafePointer<CChar>
) -> UnsafeMutablePointer<CChar>? {
    let catalog = Unmanaged<CatalogBox>.fromOpaque(handle).takeUnretainedValue().catalog
    guard let entry = catalog.entry(slug: String(cString: slug)) else {
        return nil
    }

    return encodeJSON(entry)
}

@_cdecl("daid_catalog_featured_json")
public func catalogFeaturedJSON(
    _ handle: UnsafeMutableRawPointer
) -> UnsafeMutablePointer<CChar>? {
    let catalog = Unmanaged<CatalogBox>.fromOpaque(handle).takeUnretainedValue().catalog
    guard let entry = catalog.featuredEntry() else {
        return nil
    }

    return encodeJSON(entry)
}

// MARK: - Daily word

@_cdecl("daid_catalog_daily_word_json")
public func catalogDailyWordJSON(
    _ handle: UnsafeMutableRawPointer,
    _ epochSeconds: Int64
) -> UnsafeMutablePointer<CChar>? {
    let catalog = Unmanaged<CatalogBox>.fromOpaque(handle).takeUnretainedValue().catalog
    let date = Date(timeIntervalSince1970: TimeInterval(epochSeconds))
    guard let entry = catalog.dailyWord(on: date) else {
        return nil
    }

    return encodeJSON(entry)
}

@_cdecl("daid_catalog_daily_word_slug")
public func catalogDailyWordSlug(
    _ handle: UnsafeMutableRawPointer,
    _ epochSeconds: Int64
) -> UnsafeMutablePointer<CChar>? {
    let catalog = Unmanaged<CatalogBox>.fromOpaque(handle).takeUnretainedValue().catalog
    let date = Date(timeIntervalSince1970: TimeInterval(epochSeconds))
    guard let slug = catalog.dailyWordSlug(on: date) else {
        return nil
    }

    return strdup(slug)
}

// MARK: - Random entry

@_cdecl("daid_catalog_random_json")
public func catalogRandomJSON(
    _ handle: UnsafeMutableRawPointer,
    _ excludingSlug: UnsafePointer<CChar>?
) -> UnsafeMutablePointer<CChar>? {
    let catalog = Unmanaged<CatalogBox>.fromOpaque(handle).takeUnretainedValue().catalog
    let excluded = excludingSlug.map { String(cString: $0) }
    guard let entry = catalog.randomEntry(excluding: excluded) else {
        return nil
    }

    return encodeJSON(entry)
}

// MARK: - Entry lists

@_cdecl("daid_catalog_recent_json")
public func catalogRecentJSON(
    _ handle: UnsafeMutableRawPointer,
    _ limit: Int32
) -> UnsafeMutablePointer<CChar>? {
    let catalog = Unmanaged<CatalogBox>.fromOpaque(handle).takeUnretainedValue().catalog
    return encodeJSON(catalog.recentEntries(limit: Int(limit)))
}

@_cdecl("daid_catalog_misunderstood_json")
public func catalogMisunderstoodJSON(
    _ handle: UnsafeMutableRawPointer,
    _ limit: Int32
) -> UnsafeMutablePointer<CChar>? {
    let catalog = Unmanaged<CatalogBox>.fromOpaque(handle).takeUnretainedValue().catalog
    return encodeJSON(catalog.misunderstoodEntries(limit: Int(limit)))
}

@_cdecl("daid_catalog_all_entries_json")
public func catalogAllEntriesJSON(
    _ handle: UnsafeMutableRawPointer
) -> UnsafeMutablePointer<CChar>? {
    let catalog = Unmanaged<CatalogBox>.fromOpaque(handle).takeUnretainedValue().catalog
    return encodeJSON(catalog.entries)
}

@_cdecl("daid_catalog_entries_for_slugs_json")
public func catalogEntriesForSlugsJSON(
    _ handle: UnsafeMutableRawPointer,
    _ slugsJSON: UnsafePointer<CChar>
) -> UnsafeMutablePointer<CChar>? {
    let catalog = Unmanaged<CatalogBox>.fromOpaque(handle).takeUnretainedValue().catalog
    guard let slugsData = String(cString: slugsJSON).data(using: .utf8),
          let slugs = try? JSONDecoder().decode([String].self, from: slugsData) else {
        return encodeJSON([Entry]())
    }

    return encodeJSON(catalog.entries(for: slugs))
}

// MARK: - Filtering

@_cdecl("daid_catalog_filter_json")
public func catalogFilterJSON(
    _ handle: UnsafeMutableRawPointer,
    _ filterJSON: UnsafePointer<CChar>
) -> UnsafeMutablePointer<CChar>? {
    let catalog = Unmanaged<CatalogBox>.fromOpaque(handle).takeUnretainedValue().catalog

    guard let filterData = String(cString: filterJSON).data(using: .utf8),
          let raw = try? JSONDecoder().decode(RawEntryFilter.self, from: filterData) else {
        return encodeJSON(catalog.entries)
    }

    let filter = EntryFilter(
        categorySlug: raw.categorySlug,
        difficulty: raw.difficulty.flatMap { Difficulty(rawValue: $0) },
        technicalDepth: raw.technicalDepth.flatMap { TechnicalDepth(rawValue: $0) },
        vendorFilter: raw.vendorFilter.flatMap { VendorFilter(rawValue: $0) } ?? .all,
        letter: raw.letter
    )

    return encodeJSON(catalog.entries(matching: filter))
}

// MARK: - Metadata

@_cdecl("daid_catalog_metadata_json")
public func catalogMetadataJSON(
    _ handle: UnsafeMutableRawPointer
) -> UnsafeMutablePointer<CChar>? {
    let catalog = Unmanaged<CatalogBox>.fromOpaque(handle).takeUnretainedValue().catalog
    let metadata = CatalogMetadata(
        letterStats: catalog.letterStats,
        categoryStats: catalog.categoryStats,
        featuredSlug: catalog.featuredSlug,
        latestPublishedAt: catalog.latestPublishedAt,
        editorialTimeZone: catalog.editorialTimeZone,
        dailyWordStartDate: catalog.dailyWordStartDate,
        entryCount: catalog.entries.count,
        recentSlugs: catalog.recentSlugs,
        misunderstoodSlugs: catalog.misunderstoodSlugs
    )

    return encodeJSON(metadata)
}

// MARK: - String memory

@_cdecl("daid_free_string")
public func freeString(_ ptr: UnsafeMutablePointer<CChar>) {
    free(ptr)
}

// MARK: - Internal helpers

private final class CatalogBox: @unchecked Sendable {
    let catalog: DictionaryCatalog

    init(_ catalog: DictionaryCatalog) {
        self.catalog = catalog
    }
}

private struct RawEntryFilter: Codable {
    let categorySlug: String?
    let difficulty: String?
    let technicalDepth: String?
    let vendorFilter: String?
    let letter: String?
}

private struct CatalogMetadata: Codable {
    let letterStats: [LetterStat]
    let categoryStats: [CategoryStat]
    let featuredSlug: String
    let latestPublishedAt: String
    let editorialTimeZone: String
    let dailyWordStartDate: String
    let entryCount: Int
    let recentSlugs: [String]
    let misunderstoodSlugs: [String]
}

private func encodeJSON<T: Encodable>(_ value: T) -> UnsafeMutablePointer<CChar>? {
    guard let data = try? JSONEncoder().encode(value),
          let string = String(data: data, encoding: .utf8) else {
        return nil
    }

    return strdup(string)
}
