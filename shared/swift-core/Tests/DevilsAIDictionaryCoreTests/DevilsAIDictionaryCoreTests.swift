import Foundation
import XCTest
@testable import DevilsAIDictionaryCore

final class DevilsAIDictionaryCoreTests: XCTestCase {
    private func fixtureURL() -> URL {
        URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appendingPathComponent("src/generated/entries.generated.json")
    }

    private func loadCatalog() throws -> DictionaryCatalog {
        let data = try Data(contentsOf: fixtureURL())
        return try DictionaryCatalog.decode(from: data)
    }

    func testFeaturedEntryMatchesFeaturedSlug() throws {
        let catalog = try loadCatalog()

        XCTAssertEqual(catalog.featuredEntry()?.slug, catalog.featuredSlug)
    }

    func testRecentEntriesFollowPublishedOrder() throws {
        let catalog = try loadCatalog()

        XCTAssertEqual(catalog.recentEntries(limit: 3).map(\.slug), Array(catalog.recentSlugs.prefix(3)))
    }

    func testMisunderstoodEntriesFollowPublishedOrder() throws {
        let catalog = try loadCatalog()

        XCTAssertEqual(
            catalog.misunderstoodEntries(limit: 3).map(\.slug),
            Array(catalog.misunderstoodSlugs.prefix(3))
        )
    }

    func testCategoryFilterMatchesCategoryStats() throws {
        let catalog = try loadCatalog()
        let slug = "agents-and-workflows"

        let filtered = catalog.entries(matching: EntryFilter(categorySlug: slug))
        let statCount = catalog.categoryStats.first(where: { $0.slug == slug })?.count

        XCTAssertTrue(filtered.contains(where: { $0.slug == "agent" }))
        XCTAssertEqual(filtered.count, statCount)
    }

    func testCombinedFacetFiltersStayNarrow() throws {
        let catalog = try loadCatalog()
        let filtered = catalog.entries(
            matching: EntryFilter(
                categorySlug: "product-and-vendor-terms",
                difficulty: .beginner,
                technicalDepth: .low,
                vendorFilter: .vendorOnly
            )
        )

        XCTAssertFalse(filtered.isEmpty)
        XCTAssertTrue(filtered.allSatisfy { $0.categorySlugs.contains("product-and-vendor-terms") })
        XCTAssertTrue(filtered.allSatisfy { $0.difficulty == .beginner })
        XCTAssertTrue(filtered.allSatisfy { $0.technicalDepth == .low })
        XCTAssertTrue(filtered.allSatisfy(\.isVendorTerm))
    }

    func testBookmarkRecordRoundTripsWithWebShape() throws {
        let bookmark = BookmarkRecord(
            href: "/dictionary/agent",
            title: "Agent",
            label: "Resume reading",
            description: "A saved place",
            savedAt: "2026-03-28T09:00:00Z"
        )

        let data = try JSONEncoder().encode(bookmark)
        let decoded = try JSONDecoder().decode(BookmarkRecord.self, from: data)

        XCTAssertEqual(decoded, bookmark)
    }
}
