import SwiftUI
import UIKit

#if canImport(DevilsAIDictionaryCore)
import DevilsAIDictionaryCore
#endif

enum NativePalette {
    static let paper = Color(uiColor: UIColor { trait in
        switch trait.userInterfaceStyle {
        case .dark:
            return UIColor(red: 0.09, green: 0.08, blue: 0.07, alpha: 1)
        default:
            return UIColor(red: 0.95, green: 0.93, blue: 0.89, alpha: 1)
        }
    })

    static let panel = Color(uiColor: UIColor { trait in
        switch trait.userInterfaceStyle {
        case .dark:
            return UIColor(red: 0.14, green: 0.12, blue: 0.10, alpha: 1)
        default:
            return UIColor(red: 0.99, green: 0.98, blue: 0.96, alpha: 1)
        }
    })

    static let panelStrong = Color(uiColor: UIColor { trait in
        switch trait.userInterfaceStyle {
        case .dark:
            return UIColor(red: 0.17, green: 0.14, blue: 0.12, alpha: 1)
        default:
            return UIColor(red: 0.93, green: 0.89, blue: 0.84, alpha: 1)
        }
    })

    static let border = Color(uiColor: UIColor { trait in
        switch trait.userInterfaceStyle {
        case .dark:
            return UIColor(red: 0.29, green: 0.25, blue: 0.22, alpha: 1)
        default:
            return UIColor(red: 0.83, green: 0.76, blue: 0.69, alpha: 1)
        }
    })

    static let accent = Color(uiColor: UIColor { trait in
        switch trait.userInterfaceStyle {
        case .dark:
            return UIColor(red: 0.93, green: 0.53, blue: 0.29, alpha: 1)
        default:
            return UIColor(red: 0.71, green: 0.32, blue: 0.16, alpha: 1)
        }
    })

    static let accentMuted = Color(uiColor: UIColor { trait in
        switch trait.userInterfaceStyle {
        case .dark:
            return UIColor(red: 0.40, green: 0.19, blue: 0.11, alpha: 1)
        default:
            return UIColor(red: 0.97, green: 0.88, blue: 0.80, alpha: 1)
        }
    })

    static let success = Color(uiColor: UIColor { trait in
        switch trait.userInterfaceStyle {
        case .dark:
            return UIColor(red: 0.42, green: 0.76, blue: 0.63, alpha: 1)
        default:
            return UIColor(red: 0.17, green: 0.42, blue: 0.35, alpha: 1)
        }
    })

    static let warning = Color(uiColor: UIColor { trait in
        switch trait.userInterfaceStyle {
        case .dark:
            return UIColor(red: 0.85, green: 0.42, blue: 0.34, alpha: 1)
        default:
            return UIColor(red: 0.61, green: 0.23, blue: 0.20, alpha: 1)
        }
    })

    static let mutedText = Color(uiColor: UIColor.secondaryLabel)
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
