// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "DevilsAIDictionaryCore",
    products: [
        .library(
            name: "DevilsAIDictionaryCore",
            targets: ["DevilsAIDictionaryCore"]
        )
    ],
    targets: [
        .target(
            name: "DevilsAIDictionaryCore"
        ),
        .testTarget(
            name: "DevilsAIDictionaryCoreTests",
            dependencies: ["DevilsAIDictionaryCore"]
        ),
    ]
)
