import Foundation
import XCTest
@testable import DevilsAIDictionaryCore

final class DevilsAIDictionaryCoreTests: XCTestCase {
    private let gregorianCalendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        return calendar
    }()

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

    private func utcDate(
        fromISODate value: String,
        offsetDays: Int = 0,
        hour: Int = 10,
        minute: Int = 0,
        second: Int = 0
    ) throws -> Date {
        let components = try XCTUnwrap(
            value.split(separator: "-").compactMap { Int($0) }.count == 3
                ? value.split(separator: "-").compactMap { Int($0) }
                : nil,
            "Expected ISO date in YYYY-MM-DD form."
        )

        let baseDate = try XCTUnwrap(
            gregorianCalendar.date(
                from: DateComponents(
                    timeZone: TimeZone(secondsFromGMT: 0),
                    year: components[0],
                    month: components[1],
                    day: components[2],
                    hour: hour,
                    minute: minute,
                    second: second
                )
            )
        )

        return try XCTUnwrap(
            gregorianCalendar.date(byAdding: .day, value: offsetDays, to: baseDate)
        )
    }

    func testFeaturedSlugReferencesExistingEntry() throws {
        let catalog = try loadCatalog()

        XCTAssertEqual(catalog.entry(slug: catalog.featuredSlug)?.slug, catalog.featuredSlug)
    }

    func testFeaturedEntryUsesRecentRotationWithoutDuplicatingTodayWhenPossible() throws {
        let catalog = try loadCatalog()
        let referenceDate = try utcDate(fromISODate: catalog.dailyWordStartDate)
        let todaySlug = try XCTUnwrap(catalog.dailyWordSlug(on: referenceDate))
        let candidates = catalog.recentSlugs.filter { $0 != todaySlug }

        XCTAssertFalse(candidates.isEmpty)
        XCTAssertEqual(catalog.featuredEntry(on: referenceDate)?.slug, candidates[0])
        XCTAssertNotEqual(catalog.featuredEntry(on: referenceDate)?.slug, todaySlug)
    }

    func testFeaturedEntryRotatesWeeklyAcrossRecentEntries() throws {
        let catalog = try loadCatalog()
        let startDate = try utcDate(fromISODate: catalog.dailyWordStartDate)
        let todaySlug = try XCTUnwrap(catalog.dailyWordSlug(on: startDate))
        let candidates = catalog.recentSlugs.filter { $0 != todaySlug }

        guard candidates.count > 1 else {
            throw XCTSkip("Need at least two recent candidates to verify featured rotation.")
        }

        let nextWeek = try utcDate(fromISODate: catalog.dailyWordStartDate, offsetDays: 7)

        XCTAssertEqual(catalog.featuredEntry(on: startDate)?.slug, candidates[0])
        XCTAssertEqual(catalog.featuredEntry(on: nextWeek)?.slug, candidates[1 % candidates.count])
    }

    func testDailyWordScheduleMatchesPublishedOrder() throws {
        let catalog = try loadCatalog()
        let expectedSlugs = catalog.entries
            .sorted { lhs, rhs in
                if lhs.publishedAt == rhs.publishedAt {
                    return lhs.slug < rhs.slug
                }

                return lhs.publishedAt < rhs.publishedAt
            }
            .map(\.slug)

        XCTAssertEqual(catalog.editorialTimeZone, "Africa/Johannesburg")
        XCTAssertEqual(catalog.dailyWordSlugs, expectedSlugs)
        let earliestPublishedAt = catalog.entries.map(\.publishedAt).min() ?? ""
        XCTAssertEqual(catalog.dailyWordStartDate, earliestPublishedAt)
    }

    func testDailyWordRollsOverAtEditorialMidnight() throws {
        let catalog = try loadCatalog()
        XCTAssertGreaterThanOrEqual(catalog.dailyWordSlugs.count, 2)

        let beforeMidnight = try utcDate(
            fromISODate: catalog.dailyWordStartDate,
            hour: 21,
            minute: 59,
            second: 59
        )
        let atMidnight = try utcDate(
            fromISODate: catalog.dailyWordStartDate,
            hour: 22,
            minute: 0,
            second: 0
        )

        XCTAssertEqual(catalog.dailyWordSlug(on: beforeMidnight), catalog.dailyWordSlugs[0])
        XCTAssertEqual(catalog.dailyWordSlug(on: atMidnight), catalog.dailyWordSlugs[1])
        XCTAssertEqual(catalog.dailyWord(on: atMidnight)?.slug, catalog.dailyWordSlugs[1])
    }

    func testDailyWordDoesNotRepeatBeforeScheduleWraps() throws {
        let catalog = try loadCatalog()

        let firstCycleSlugs = try catalog.dailyWordSlugs.enumerated().map { index, _ in
            try XCTUnwrap(
                catalog.dailyWordSlug(
                    on: utcDate(fromISODate: catalog.dailyWordStartDate, offsetDays: index)
                )
            )
        }

        XCTAssertEqual(firstCycleSlugs, catalog.dailyWordSlugs)
        XCTAssertEqual(Set(firstCycleSlugs).count, catalog.dailyWordSlugs.count)
    }

    func testDailyWordWrapsBackToStartAfterFullCycle() throws {
        let catalog = try loadCatalog()

        let wrappedDate = try utcDate(
            fromISODate: catalog.dailyWordStartDate,
            offsetDays: catalog.dailyWordSlugs.count
        )

        XCTAssertEqual(catalog.dailyWordSlug(on: wrappedDate), catalog.dailyWordSlugs.first)
    }

    func testDailyWordDefaultsEditorialTimeZoneWhenMissing() throws {
        let data = try Data(contentsOf: fixtureURL())
        var json = try XCTUnwrap(
            JSONSerialization.jsonObject(with: data) as? [String: Any]
        )

        json.removeValue(forKey: "editorialTimeZone")

        let legacyData = try JSONSerialization.data(withJSONObject: json)
        let catalog = try DictionaryCatalog.decode(from: legacyData)

        XCTAssertEqual(catalog.editorialTimeZone, "Africa/Johannesburg")
    }

    func testRecentEntriesFollowPublishedOrder() throws {
        let catalog = try loadCatalog()

        XCTAssertEqual(catalog.recentEntries(limit: 3).map(\.slug), Array(catalog.recentSlugs.prefix(3)))
    }

    func testLatestPublishedAtMatchesNewestEntry() throws {
        let catalog = try loadCatalog()
        let newestEntry = try XCTUnwrap(
            catalog.entries.max { lhs, rhs in
                lhs.publishedAt < rhs.publishedAt
            }
        )

        XCTAssertEqual(catalog.latestPublishedAt, newestEntry.publishedAt)
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

    func testRandomEntryCanExcludeCurrentSlug() throws {
        let catalog = try loadCatalog()
        let excluded = catalog.featuredSlug

        let randomEntry = catalog.randomEntry(excluding: excluded)

        XCTAssertNotNil(randomEntry)
        XCTAssertNotEqual(randomEntry?.slug, excluded)
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

    func testSlugFromDictionaryPathExtractsEntrySlugs() {
        XCTAssertEqual(slugFromDictionaryPath("/dictionary/agent"), "agent")
        XCTAssertEqual(slugFromDictionaryPath("/dictionary/agent/"), "agent")
        XCTAssertNil(slugFromDictionaryPath("/search"))
        XCTAssertNil(slugFromDictionaryPath("/dictionary/"))
        XCTAssertNil(slugFromDictionaryPath("/dictionary/agent/extra"))
    }

    func testDictionarySlugFromLinkAcceptsAppSchemeAndWebsiteLinks() {
        XCTAssertEqual(
            dictionarySlugFromLink(
                scheme: "devilsaidictionary",
                host: "dictionary",
                path: "/agent",
                directSlug: "agent"
            ),
            "agent"
        )
        XCTAssertEqual(
            dictionarySlugFromLink(
                scheme: "https",
                host: "thedevilsaidictionary.com",
                path: "/dictionary/agent"
            ),
            "agent"
        )
        XCTAssertEqual(
            dictionarySlugFromLink(
                scheme: "https",
                host: "www.thedevilsaidictionary.com",
                path: "/dictionary/agent/"
            ),
            "agent"
        )
        XCTAssertNil(
            dictionarySlugFromLink(
                scheme: "https",
                host: "example.com",
                path: "/dictionary/agent"
            )
        )
    }

    func testPendingDictionaryNavigationWaitsForCatalogBeforeRouting() {
        XCTAssertEqual(
            resolvePendingDictionaryNavigation(
                path: "/dictionary/agent",
                hasLoadedCatalog: false,
                hasLoadError: false
            ),
            .waitForCatalog
        )
    }

    func testPendingDictionaryNavigationRoutesOnceCatalogIsResolved() {
        XCTAssertEqual(
            resolvePendingDictionaryNavigation(
                path: "/dictionary/agent",
                hasLoadedCatalog: true,
                hasLoadError: false
            ),
            .routeToEntry("agent")
        )
        XCTAssertEqual(
            resolvePendingDictionaryNavigation(
                path: "/dictionary/missing-term",
                hasLoadedCatalog: false,
                hasLoadError: true
            ),
            .routeToEntry("missing-term")
        )
    }

    func testPendingDictionaryNavigationClearsInvalidPaths() {
        XCTAssertEqual(
            resolvePendingDictionaryNavigation(
                path: "/search",
                hasLoadedCatalog: true,
                hasLoadError: false
            ),
            .clearPendingPath
        )
    }

    func testCurrentWordRecordRoundTrips() throws {
        let catalog = try loadCatalog()
        let entry = try XCTUnwrap(catalog.featuredEntry())
        let record = CurrentWordRecord(
            entry: entry,
            updatedAt: "2026-03-28T10:00:00Z",
            source: .notificationTap
        )

        let data = try JSONEncoder().encode(record)
        let decoded = try JSONDecoder().decode(CurrentWordRecord.self, from: data)

        XCTAssertEqual(decoded, record)
    }

    func testCurrentWordRecordRoundTripsLocalNotificationSource() throws {
        let record = CurrentWordRecord(
            slug: "agent",
            title: "Agent",
            devilDefinition: "Devil definition",
            plainDefinition: "Plain definition",
            updatedAt: "2026-03-28T10:00:00Z",
            source: .localNotification
        )

        let data = try JSONEncoder().encode(record)
        let decoded = try JSONDecoder().decode(CurrentWordRecord.self, from: data)

        XCTAssertEqual(decoded.source, .localNotification)
        XCTAssertEqual(decoded, record)
    }

    func testSyncPayloadRejectsStaleCatalogVersion() {
        let payload = CurrentWordSyncPayload(
            catalogVersion: "catalog-a",
            currentWord: CurrentWordRecord(
                slug: "agent",
                title: "Agent",
                devilDefinition: "Devil definition",
                plainDefinition: "Plain definition",
                updatedAt: "2026-03-28T10:00:00Z",
                source: .phoneSync
            )
        )

        XCTAssertFalse(payload.isCompatible(with: "catalog-b"))
        XCTAssertTrue(payload.isCompatible(with: "catalog-a"))
    }
}
