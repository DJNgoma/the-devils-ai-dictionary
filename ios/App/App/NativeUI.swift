import SwiftUI
import UIKit

#if canImport(DevilsAIDictionaryCore)
import DevilsAIDictionaryCore
#endif

// MARK: - Theme system

enum SiteTheme: String, CaseIterable, Identifiable, Hashable {
    case book, codex, absolutely, night

    var id: String { rawValue }

    var label: String {
        switch self {
        case .book: "Book"
        case .codex: "Codex"
        case .absolutely: "Absolutely"
        case .night: "Night"
        }
    }

    var colorScheme: ColorScheme {
        self == .night ? .dark : .light
    }

    var swatches: (Color, Color, Color) {
        switch self {
        case .book: (Self.hex("b2552f"), Self.hex("26594a"), Self.hex("f4efe6"))
        case .codex: (Self.hex("0169cc"), Self.hex("751ed9"), Self.hex("f3f8fd"))
        case .absolutely: (Self.hex("cc7d5e"), Self.hex("f9f9f7"), Self.hex("2d2d2b"))
        case .night: (Self.hex("e4864d"), Self.hex("5ec9a1"), Self.hex("12100d"))
        }
    }

    static func hex(_ v: String) -> Color {
        var rgb: UInt64 = 0
        Scanner(string: v).scanHexInt64(&rgb)
        return Color(
            red: Double((rgb >> 16) & 0xFF) / 255,
            green: Double((rgb >> 8) & 0xFF) / 255,
            blue: Double(rgb & 0xFF) / 255
        )
    }
}

struct ThemeColorSet {
    let paper: Color
    let panel: Color
    let panelStrong: Color
    let border: Color
    let accent: Color
    let accentMuted: Color
    let success: Color
    let warning: Color
    let mutedText: Color

    static func palette(for theme: SiteTheme) -> ThemeColorSet {
        switch theme {
        case .book:
            return ThemeColorSet(
                paper: .hex("f4efe6"),
                panel: .hex("fffbf5"),
                panelStrong: .hex("efe7da"),
                border: .hex("d4c2b0"),
                accent: .hex("b2552f"),
                accentMuted: .hex("f7e0cf"),
                success: .hex("26594a"),
                warning: .hex("a63b32"),
                mutedText: .hex("65584c")
            )
        case .codex:
            return ThemeColorSet(
                paper: .hex("f3f8fd"),
                panel: .hex("ffffff"),
                panelStrong: .hex("e9f1f9"),
                border: .hex("c4d5e8"),
                accent: .hex("0169cc"),
                accentMuted: .hex("d6e8f5"),
                success: .hex("00a240"),
                warning: .hex("e02e2a"),
                mutedText: .hex("516273")
            )
        case .absolutely:
            return ThemeColorSet(
                paper: .hex("f6f3ee"),
                panel: .hex("f9f9f7"),
                panelStrong: .hex("f0ece4"),
                border: .hex("ddd0c3"),
                accent: .hex("cc7d5e"),
                accentMuted: .hex("f5e2d6"),
                success: .hex("00c853"),
                warning: .hex("ff5f38"),
                mutedText: .hex("6e685f")
            )
        case .night:
            return ThemeColorSet(
                paper: .hex("12100d"),
                panel: .hex("1c1814"),
                panelStrong: .hex("211c17"),
                border: .hex("4a3d38"),
                accent: .hex("e4864d"),
                accentMuted: .hex("663019"),
                success: .hex("5ec9a1"),
                warning: .hex("f08a7d"),
                mutedText: .hex("b8a893")
            )
        }
    }
}

private extension Color {
    static func hex(_ v: String) -> Color { SiteTheme.hex(v) }
}

@MainActor
final class ThemeManager: ObservableObject {
    static let shared = ThemeManager()

    @Published private(set) var current: SiteTheme
    @Published private(set) var colors: ThemeColorSet

    private static let storageKey = "site-theme"

    private init() {
        let stored = UserDefaults.standard.string(forKey: Self.storageKey) ?? "book"
        let theme = SiteTheme(rawValue: stored) ?? .book
        current = theme
        colors = ThemeColorSet.palette(for: theme)
    }

    func setTheme(_ theme: SiteTheme) {
        current = theme
        colors = ThemeColorSet.palette(for: theme)
        UserDefaults.standard.set(theme.rawValue, forKey: Self.storageKey)
    }
}

@MainActor
enum NativePalette {
    static var paper: Color { ThemeManager.shared.colors.paper }
    static var panel: Color { ThemeManager.shared.colors.panel }
    static var panelStrong: Color { ThemeManager.shared.colors.panelStrong }
    static var border: Color { ThemeManager.shared.colors.border }
    static var accent: Color { ThemeManager.shared.colors.accent }
    static var accentMuted: Color { ThemeManager.shared.colors.accentMuted }
    static var success: Color { ThemeManager.shared.colors.success }
    static var warning: Color { ThemeManager.shared.colors.warning }
    static var mutedText: Color { ThemeManager.shared.colors.mutedText }
}

struct NativeCard<Content: View>: View {
    var emphasis = false
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            content
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(emphasis ? NativePalette.panelStrong : NativePalette.panel)
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(NativePalette.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(
            color: Color.black.opacity(emphasis ? 0.10 : 0.05),
            radius: emphasis ? 18 : 10,
            x: 0,
            y: emphasis ? 10 : 6
        )
    }
}

struct NativeSectionLabel: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.system(size: 11, weight: .semibold, design: .monospaced))
            .textCase(.uppercase)
            .foregroundStyle(NativePalette.mutedText)
    }
}

struct NativeChip: View {
    enum Tone {
        case neutral
        case accent
        case success
        case warning
    }

    let label: String
    var tone: Tone = .neutral

    var body: some View {
        Text(label)
            .font(.system(size: 12, weight: .semibold, design: .rounded))
            .foregroundStyle(foreground)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(background, in: Capsule())
            .overlay(
                Capsule()
                    .stroke(border, lineWidth: 1)
            )
    }

    private var foreground: Color {
        switch tone {
        case .neutral:
            return .primary
        case .accent:
            return NativePalette.accent
        case .success:
            return NativePalette.success
        case .warning:
            return NativePalette.warning
        }
    }

    private var background: Color {
        switch tone {
        case .neutral:
            return NativePalette.panelStrong
        case .accent:
            return NativePalette.accentMuted
        case .success:
            return NativePalette.success.opacity(0.12)
        case .warning:
            return NativePalette.warning.opacity(0.12)
        }
    }

    private var border: Color {
        switch tone {
        case .neutral:
            return NativePalette.border
        case .accent:
            return NativePalette.accent.opacity(0.28)
        case .success:
            return NativePalette.success.opacity(0.28)
        case .warning:
            return NativePalette.warning.opacity(0.28)
        }
    }
}

struct NativePrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .semibold, design: .rounded))
            .padding(.horizontal, 16)
            .padding(.vertical, 13)
            .frame(minHeight: 48)
            .background(
                NativePalette.accent.opacity(configuration.isPressed ? 0.88 : 1),
                in: RoundedRectangle(cornerRadius: 18, style: .continuous)
            )
            .foregroundStyle(Color.white)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

struct NativeSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .semibold, design: .rounded))
            .padding(.horizontal, 16)
            .padding(.vertical, 13)
            .frame(minHeight: 48)
            .background(
                NativePalette.panel,
                in: RoundedRectangle(cornerRadius: 18, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(NativePalette.border, lineWidth: 1)
            )
            .foregroundStyle(.primary)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

struct NativeEntryCard: View {
    let entry: Entry
    var compact = false
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            NativeCard {
                HStack(alignment: .top) {
                    NativeChip(label: entry.letter, tone: .accent)

                    if entry.isVendorTerm {
                        NativeChip(label: "Vendor term", tone: .success)
                    }

                    Spacer(minLength: 12)

                    Text(nativeFormattedDate(entry.updatedAt))
                        .font(.system(size: 12, weight: .medium, design: .rounded))
                        .foregroundStyle(NativePalette.mutedText)
                }

                Text(entry.title)
                    .font(.system(size: compact ? 24 : 30, weight: .semibold, design: .serif))
                    .multilineTextAlignment(.leading)

                Text(entry.devilDefinition.trimmingCharacters(in: .whitespacesAndNewlines))
                    .font(.system(size: compact ? 15 : 17, weight: .medium, design: .rounded))
                    .foregroundStyle(.primary)
                    .multilineTextAlignment(.leading)
                    .lineLimit(compact ? 3 : 5)

                Text(entry.plainDefinition.trimmingCharacters(in: .whitespacesAndNewlines))
                    .font(.system(size: compact ? 14 : 15, weight: .regular, design: .rounded))
                    .foregroundStyle(NativePalette.mutedText)
                    .multilineTextAlignment(.leading)
                    .lineLimit(compact ? 3 : 4)

                HStack {
                    ForEach(entry.categories.prefix(2), id: \.self) { category in
                        NativeChip(label: category)
                    }

                    Spacer(minLength: 12)

                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(NativePalette.accent)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

struct NativeScreen<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        ZStack {
            NativePalette.paper.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    content
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 18)
            }
        }
    }
}
