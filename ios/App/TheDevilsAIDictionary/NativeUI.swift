import SwiftUI

#if os(iOS)
import UIKit
#endif

#if canImport(DevilsAIDictionaryCore)
import DevilsAIDictionaryCore
#endif

// MARK: - Theme system

enum ThemeAppearanceGroup: String, CaseIterable, Identifiable {
    case light
    case dark

    var id: String { rawValue }

    var label: String {
        switch self {
        case .light: "Light editions"
        case .dark: "Dark editions"
        }
    }
}

enum SiteThemeMode: String {
    case auto
    case manual
}

enum SiteTheme: String, CaseIterable, Identifiable, Hashable {
    case book, codex, absolutely, devil, night

    var id: String { rawValue }

    var label: String {
        switch self {
        case .book: "Book"
        case .codex: "Codex"
        case .absolutely: "Absolutely"
        case .devil: "Devil"
        case .night: "Night"
        }
    }

    var appearanceGroup: ThemeAppearanceGroup {
        switch self {
        case .devil, .night:
            return .dark
        default:
            return .light
        }
    }

    var isDark: Bool {
        appearanceGroup == .dark
    }

    var colorScheme: ColorScheme {
        isDark ? .dark : .light
    }

    var swatches: (Color, Color, Color) {
        switch self {
        case .book: (Self.hex("b2552f"), Self.hex("26594a"), Self.hex("f4efe6"))
        case .codex: (Self.hex("0169cc"), Self.hex("751ed9"), Self.hex("f3f8fd"))
        case .absolutely: (Self.hex("cc7d5e"), Self.hex("f9f9f7"), Self.hex("2d2d2b"))
        case .devil: (Self.hex("c92a2a"), Self.hex("f08b57"), Self.hex("170909"))
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
        case .devil:
            return ThemeColorSet(
                paper: .hex("170909"),
                panel: .hex("241110"),
                panelStrong: .hex("2f1615"),
                border: .hex("5a2d2a"),
                accent: .hex("c92a2a"),
                accentMuted: .hex("4a1717"),
                success: .hex("f0b35e"),
                warning: .hex("ff8b78"),
                mutedText: .hex("c5a7a1")
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

extension View {
    @ViewBuilder
    func nativeStackNavigationViewStyle() -> some View {
        #if os(macOS)
        self
        #else
        self.navigationViewStyle(.stack)
        #endif
    }

    @ViewBuilder
    func nativeNavigationBarTitleDisplayMode(_ mode: NativeNavigationTitleDisplayMode) -> some View {
        #if os(macOS)
        self
        #else
        switch mode {
        case .automatic:
            self.navigationBarTitleDisplayMode(.automatic)
        case .large:
            self.navigationBarTitleDisplayMode(.large)
        case .inline:
            self.navigationBarTitleDisplayMode(.inline)
        }
        #endif
    }

    @ViewBuilder
    func nativeNavigationBarHidden(_ hidden: Bool) -> some View {
        #if os(macOS)
        self
        #else
        self.navigationBarHidden(hidden)
        #endif
    }

    @ViewBuilder
    func nativeSearchable(text: Binding<String>, prompt: String) -> some View {
        #if os(macOS)
        self.searchable(text: text, prompt: prompt)
        #else
        self.searchable(
            text: text,
            placement: .navigationBarDrawer(displayMode: .always),
            prompt: prompt
        )
        #endif
    }

    @ViewBuilder
    func nativeTextEntryBehavior() -> some View {
        #if os(macOS)
        self
        #else
        self
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
        #endif
    }

    @ViewBuilder
    func nativeOverflowToolbarIfNeeded(model: NativeDictionaryModel, themeManager: ThemeManager) -> some View {
        if model.isDeveloperScreenshotMode {
            self
        } else {
            self.toolbar {
                NativeOverflowToolbar(model: model, themeManager: themeManager)
            }
        }
    }
}

enum NativeNavigationTitleDisplayMode {
    case automatic
    case large
    case inline
}

extension ToolbarItemPlacement {
    static var nativeNavigationTrailing: ToolbarItemPlacement {
        #if os(macOS)
        return .automatic
        #else
        return .navigationBarTrailing
        #endif
    }
}

@MainActor
final class ThemeManager: ObservableObject {
    static let shared = ThemeManager()

    @Published private(set) var mode: SiteThemeMode
    @Published private(set) var manualSelection: SiteTheme
    @Published private(set) var current: SiteTheme
    @Published private(set) var colors: ThemeColorSet
    @Published private(set) var preferredColorSchemeOverride: ColorScheme?

    private static let themeStorageKey = "site-theme"
    private static let modeStorageKey = "site-theme-mode"
    private var systemColorScheme: ColorScheme = .light

    private init() {
        let defaults = UserDefaults.standard
        let storedTheme = defaults.string(forKey: Self.themeStorageKey) ?? "book"
        let manualTheme = SiteTheme(rawValue: storedTheme) ?? .book
        let storedMode = defaults.string(forKey: Self.modeStorageKey)
        let resolvedMode: SiteThemeMode
        if let storedMode,
           let mode = SiteThemeMode(rawValue: storedMode) {
            resolvedMode = mode
        } else if defaults.string(forKey: Self.themeStorageKey) != nil {
            resolvedMode = .manual
        } else {
            resolvedMode = .auto
        }

        mode = resolvedMode
        manualSelection = manualTheme
        current = .book
        colors = ThemeColorSet.palette(for: .book)
        preferredColorSchemeOverride = nil
        applyResolvedTheme()
    }

    func setTheme(_ theme: SiteTheme) {
        manualSelection = theme
        UserDefaults.standard.set(theme.rawValue, forKey: Self.themeStorageKey)

        if mode == .manual {
            applyResolvedTheme()
        }
    }

    func setMode(_ nextMode: SiteThemeMode) {
        guard mode != nextMode else {
            return
        }

        mode = nextMode
        UserDefaults.standard.set(nextMode.rawValue, forKey: Self.modeStorageKey)
        applyResolvedTheme()
    }

    func updateSystemColorScheme(_ colorScheme: ColorScheme) {
        systemColorScheme = colorScheme

        if mode == .auto {
            applyResolvedTheme()
        }
    }

    var autoSummary: String {
        "Book in light mode. Night after dark."
    }

    var currentModeLabel: String {
        current.appearanceGroup == .dark ? "dark" : "light"
    }

    private func applyResolvedTheme() {
        let resolvedTheme: SiteTheme
        switch mode {
        case .auto:
            resolvedTheme = systemColorScheme == .dark ? .night : .book
            preferredColorSchemeOverride = nil
        case .manual:
            resolvedTheme = manualSelection
            preferredColorSchemeOverride = manualSelection.colorScheme
        }

        current = resolvedTheme
        colors = ThemeColorSet.palette(for: resolvedTheme)
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

struct ConfirmRemoveButton: View {
    let action: () -> Void
    @State private var armed = false

    var body: some View {
        Button {
            if armed {
                armed = false
                action()
            } else {
                withAnimation(.easeOut(duration: 0.18)) { armed = true }
            }
        } label: {
            Text(armed ? "Remove?" : "Remove")
                .id(armed)
                .transition(.scale(scale: 0.92).combined(with: .opacity))
        }
        .buttonStyle(NativeSecondaryButtonStyle())
        .animation(.easeOut(duration: 0.18), value: armed)
    }
}

struct SaveConfirmButton: View {
    let label: String
    let action: () -> Void
    @State private var saved = false

    var body: some View {
        Button {
            action()
            withAnimation(.easeOut(duration: 0.18)) { saved = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) {
                withAnimation(.easeOut(duration: 0.18)) { saved = false }
            }
        } label: {
            Text(saved ? "Saved ✓" : label)
                .id(saved)
                .transition(.scale(scale: 0.92).combined(with: .opacity))
        }
        .buttonStyle(NativePrimaryButtonStyle())
        .animation(.easeOut(duration: 0.18), value: saved)
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

enum NativeScreenWidthClass {
    case phone
    case tablet
    case desktopLike
}

struct NativeScreenLayout {
    let containerSize: CGSize

    private var width: CGFloat {
        containerSize.width
    }

    private var height: CGFloat {
        containerSize.height
    }

    var widthClass: NativeScreenWidthClass {
        if width >= 960, width > height {
            return .desktopLike
        }

        if width >= 700, min(width, height) >= 500 {
            return .tablet
        }

        return .phone
    }

    var horizontalPadding: CGFloat {
        switch widthClass {
        case .phone:
            return 16
        case .tablet:
            return 24
        case .desktopLike:
            return 32
        }
    }

    var maxContentWidth: CGFloat {
        let availableWidth = max(width - (horizontalPadding * 2), 0)

        switch widthClass {
        case .phone:
            return availableWidth
        case .tablet:
            return min(availableWidth, 860)
        case .desktopLike:
            return min(availableWidth, 1120)
        }
    }

    var readingColumnWidth: CGFloat {
        switch widthClass {
        case .phone:
            return maxContentWidth
        case .tablet:
            return min(maxContentWidth, 760)
        case .desktopLike:
            return min(maxContentWidth, 820)
        }
    }

    var cardColumnCount: Int {
        switch widthClass {
        case .phone:
            return 1
        case .tablet:
            return 2
        case .desktopLike:
            return 3
        }
    }

    var cardGridItems: [GridItem] {
        Array(
            repeating: GridItem(.flexible(), spacing: 12, alignment: .top),
            count: cardColumnCount
        )
    }
}

struct NativeScreen<Content: View>: View {
    private let content: (NativeScreenLayout) -> Content

    init(@ViewBuilder content: @escaping (NativeScreenLayout) -> Content) {
        self.content = content
    }

    var body: some View {
        GeometryReader { geometry in
            let layout = NativeScreenLayout(containerSize: geometry.size)

            ZStack {
                NativePalette.paper.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        content(layout)
                    }
                    .frame(maxWidth: layout.maxContentWidth, alignment: .leading)
                    .padding(.horizontal, layout.horizontalPadding)
                    .padding(.vertical, 18)
                    .frame(maxWidth: .infinity, alignment: .center)
                }
            }
        }
    }
}

struct NativeShareButton: View {
    let url: URL
    let subject: String
    let message: String
    var label = "Share"

    #if os(iOS)
    @State private var isPresentingShareSheet = false
    #endif

    var body: some View {
        #if os(iOS)
        Button(label) {
            isPresentingShareSheet = true
        }
        .buttonStyle(NativeSecondaryButtonStyle())
        .sheet(isPresented: $isPresentingShareSheet) {
            NativeActivityView(
                activityItems: [message, url],
                subject: subject
            )
        }
        #else
        ShareLink(
            item: url,
            subject: Text(subject),
            message: Text(message)
        ) {
            Text(label)
        }
        .buttonStyle(NativeSecondaryButtonStyle())
        #endif
    }
}

#if os(iOS)
private struct NativeActivityView: UIViewControllerRepresentable {
    let activityItems: [Any]
    let subject: String

    func makeUIViewController(context: Context) -> UIActivityViewController {
        let controller = UIActivityViewController(
            activityItems: activityItems,
            applicationActivities: nil
        )
        controller.setValue(subject, forKey: "subject")
        return controller
    }

    func updateUIViewController(
        _ uiViewController: UIActivityViewController,
        context: Context
    ) {}
}
#endif
