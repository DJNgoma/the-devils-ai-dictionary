import XCTest

final class TheDevilsAIDictionaryUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testHomeLaunchShowsPrimaryTabs() {
        let app = XCUIApplication()
        app.launchForSmokeTest(preset: .home)

        XCTAssertTrue(app.uiElement("home.container").waitForExistence(timeout: 10))
        XCTAssertTrue(app.uiElement("home.today-word.open").waitForExistence(timeout: 5))

        assertTabExists(app, identifier: "tab.home", label: "Home")
        assertTabExists(app, identifier: "tab.search", label: "Search")
        assertTabExists(app, identifier: "tab.categories", label: "Categories")
        assertTabExists(app, identifier: "tab.saved", label: "Saved")
        assertTabExists(app, identifier: "tab.settings", label: "Settings")
    }

    func testSearchTabNavigationWorksFromHome() {
        let app = XCUIApplication()
        app.launchForSmokeTest(preset: .home)

        XCTAssertTrue(app.uiElement("home.container").waitForExistence(timeout: 10))

        tapTab(app, identifier: "tab.search", label: "Search")
        XCTAssertTrue(app.uiElement("search.container").waitForExistence(timeout: 5))
    }

    func testCategoriesTabNavigationWorksFromHome() {
        let app = XCUIApplication()
        app.launchForSmokeTest(preset: .home)

        XCTAssertTrue(app.uiElement("home.container").waitForExistence(timeout: 10))

        tapTab(app, identifier: "tab.categories", label: "Categories")
        XCTAssertTrue(app.uiElement("categories.container").waitForExistence(timeout: 5))
    }

    func testSavedTabNavigationWorksFromHome() {
        let app = XCUIApplication()
        app.launchForSmokeTest(preset: .home)

        XCTAssertTrue(app.uiElement("home.container").waitForExistence(timeout: 10))

        tapTab(app, identifier: "tab.saved", label: "Saved")
        XCTAssertTrue(app.uiElement("saved.container").waitForExistence(timeout: 5))
    }

    func testSettingsTabNavigationWorksFromHome() {
        let app = XCUIApplication()
        app.launchForSmokeTest(preset: .home)

        XCTAssertTrue(app.uiElement("home.container").waitForExistence(timeout: 10))

        tapTab(app, identifier: "tab.settings", label: "Settings")
        XCTAssertTrue(app.uiElement("settings.container").waitForExistence(timeout: 5))
    }

    func testSearchPresetShowsSeededQueryAndResults() {
        let app = XCUIApplication()
        app.launchForSmokeTest(preset: .search)

        XCTAssertTrue(app.uiElement("search.container").waitForExistence(timeout: 10))
        XCTAssertTrue(app.uiElement("search.results").waitForExistence(timeout: 5))

        let searchField = app.searchFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 5))

        let fieldValue = String(describing: searchField.value ?? "")
        XCTAssertTrue(fieldValue.localizedCaseInsensitiveContains("agent"))
    }

    func testSavedPresetShowsSeededSavedWord() {
        let app = XCUIApplication()
        app.launchForSmokeTest(preset: .saved)

        XCTAssertTrue(app.uiElement("saved.container").waitForExistence(timeout: 10))
        XCTAssertTrue(app.uiElement("saved.words.list").waitForExistence(timeout: 5))
        XCTAssertGreaterThan(app.buttons.matching(NSPredicate(format: "label == %@", "Open word")).count, 0)
    }

    func testEntryPresetShowsEntryDetail() {
        let app = XCUIApplication()
        app.launchForSmokeTest(preset: .entry)

        XCTAssertTrue(app.uiElement("entry.detail").waitForExistence(timeout: 10))

        let title = app.staticTexts.matching(identifier: "entry.title").firstMatch
        XCTAssertTrue(title.waitForExistence(timeout: 5))
        XCTAssertFalse(title.label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
    }

    private func assertTabExists(
        _ app: XCUIApplication,
        identifier: String,
        label: String,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        let button = app.tabButton(identifier: identifier, label: label)
        XCTAssertTrue(button.waitForExistence(timeout: 5), file: file, line: line)
    }

    private func tapTab(
        _ app: XCUIApplication,
        identifier: String,
        label: String,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        let button = app.tabButton(identifier: identifier, label: label)
        XCTAssertTrue(button.waitForExistence(timeout: 5), file: file, line: line)

        if !button.isHittable {
            XCTAssertTrue(app.forceForeground(), file: file, line: line)

            let refreshedButton = app.tabButton(identifier: identifier, label: label)
            XCTAssertTrue(refreshedButton.waitForExistence(timeout: 5), file: file, line: line)
            XCTAssertTrue(refreshedButton.isHittable, file: file, line: line)
            refreshedButton.tap()
            return
        }

        button.tap()
    }
}
