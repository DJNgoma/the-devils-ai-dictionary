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

    func bringToForeground() -> Bool {
        if state == .runningForeground {
            return true
        }

        return forceForeground()
    }

    func forceForeground() -> Bool {
        activate()
        return wait(for: .runningForeground, timeout: 5)
    }

    func tabButton(identifier: String, label: String) -> XCUIElement {
        let identifiedButton = tabBars.buttons.matching(identifier: identifier).firstMatch
        if identifiedButton.exists {
            return identifiedButton
        }

        return tabBars.buttons[label]
    }
}
