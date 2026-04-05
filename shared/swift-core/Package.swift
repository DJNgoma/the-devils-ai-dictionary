// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "DevilsAIDictionaryCore",
    products: [
        .library(
            name: "DevilsAIDictionaryCore",
            targets: ["DevilsAIDictionaryCore"]
        ),
        .library(
            name: "DevilsAIDictionaryCoreAndroidBridge",
            type: .dynamic,
            targets: ["DevilsAIDictionaryCoreAndroidBridge"]
        ),
    ],
    targets: [
        .target(
            name: "DevilsAIDictionaryCore"
        ),
        .target(
            name: "DevilsAIDictionaryCoreAndroidBridge",
            dependencies: ["DevilsAIDictionaryCore"]
        ),
        .testTarget(
            name: "DevilsAIDictionaryCoreTests",
            dependencies: ["DevilsAIDictionaryCore"]
        ),
    ]
)
