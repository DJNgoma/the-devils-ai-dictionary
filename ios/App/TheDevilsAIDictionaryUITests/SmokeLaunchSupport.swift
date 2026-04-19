import XCTest

enum SmokePreset: String {
    case home
    case search
    case categories
    case saved
    case entry
}

extension XCUIApplication {
    func launchForSmokeTest(preset: SmokePreset) {
        launchArguments = [
            "-ui-testing", "YES",
            "-developer-mode", "YES",
            "-developer-screenshot-preset", preset.rawValue,
            "-site-theme", "book",
        ]

        launch()
    }

    func uiElement(_ identifier: String) -> XCUIElement {
        descendants(matching: .any).matching(identifier: identifier).firstMatch
    }

    func tabButton(identifier: String, label: String) -> XCUIElement {
        let identifiedButton = tabBars.buttons.matching(identifier: identifier).firstMatch
        if identifiedButton.exists {
            return identifiedButton
        }

        return tabBars.buttons[label]
    }
}
