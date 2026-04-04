import SwiftUI

#if os(iOS)
struct SplashScreenView: View {
    @Environment(\.colorScheme) private var colorScheme

    @State private var logoOpacity: Double = 0
    @State private var logoScale: CGFloat = 0.8
    @State private var titleOpacity: Double = 0
    @State private var titleOffset: CGFloat = 12
    @State private var dismissOpacity: Double = 1

    let onFinished: () -> Void

    private var backgroundColor: Color {
        colorScheme == .dark ? Color(red: 0x12/255.0, green: 0x10/255.0, blue: 0x0D/255.0)
                            : Color(red: 0xF4/255.0, green: 0xEF/255.0, blue: 0xE6/255.0)
    }

    private var titleColor: Color {
        colorScheme == .dark ? Color(red: 0xF4/255.0, green: 0xEF/255.0, blue: 0xE6/255.0)
                            : Color(red: 0x14/255.0, green: 0x09/255.0, blue: 0x04/255.0)
    }

    var body: some View {
        ZStack {
            backgroundColor.ignoresSafeArea()

            VStack(spacing: 24) {
                if let icon = UIImage(named: "AppIcon") {
                    Image(uiImage: icon)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 120, height: 120)
                        .clipShape(RoundedRectangle(cornerRadius: 27, style: .continuous))
                        .scaleEffect(logoScale)
                        .opacity(logoOpacity)
                }

                Text("The Devil's AI Dictionary")
                    .font(.system(size: 22, weight: .semibold, design: .serif))
                    .foregroundStyle(titleColor)
                    .opacity(titleOpacity)
                    .offset(y: titleOffset)
            }
        }
        .opacity(dismissOpacity)
        .onAppear {
            withAnimation(.easeOut(duration: 0.3)) {
                logoOpacity = 1
                logoScale = 1.0
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                withAnimation(.easeOut(duration: 0.3)) {
                    titleOpacity = 1
                    titleOffset = 0
                }
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                withAnimation(.easeIn(duration: 0.3)) {
                    dismissOpacity = 0
                }
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) {
                onFinished()
            }
        }
    }
}
#endif
