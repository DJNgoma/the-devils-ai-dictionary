import SwiftUI

struct WatchCurrentWordView: View {
    @ObservedObject var model: WatchCurrentWordModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text("Current word")
                    .font(.system(.caption, design: .rounded, weight: .semibold))
                    .foregroundStyle(.secondary)

                if let currentWord = model.currentWord {
                    Text(currentWord.title)
                        .font(.system(.title3, design: .serif, weight: .semibold))
                        .multilineTextAlignment(.leading)

                    Text(currentWord.devilDefinition.trimmingCharacters(in: .whitespacesAndNewlines))
                        .font(.system(.body, design: .rounded))
                        .foregroundStyle(.primary)

                    if let warningLabel = currentWord.warningLabel {
                        Text(warningLabel)
                            .font(.system(.footnote, design: .rounded, weight: .medium))
                            .padding(8)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.red.opacity(0.14), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                } else if let loadError = model.loadError {
                    Text(loadError)
                        .font(.system(.footnote, design: .rounded))
                        .foregroundStyle(.secondary)
                } else {
                    ProgressView()
                        .frame(maxWidth: .infinity, alignment: .center)
                }

                VStack(spacing: 8) {
                    Button("Refresh") {
                        model.refresh()
                    }
                    .buttonStyle(.borderedProminent)

                    Button("Open on iPhone") {
                        model.openOnPhone()
                    }
                    .buttonStyle(.bordered)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 6)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
        }
        .containerBackground(.background.tertiary, for: .navigation)
    }
}

#Preview {
    WatchCurrentWordView(model: WatchCurrentWordModel())
}
