#!/usr/bin/env bash
# Cross-compile DevilsAIDictionaryCoreAndroidBridge for Android (arm64-v8a + x86_64).
# Requires: Swift 6.3 open-source toolchain + swift-6.3-RELEASE_android SDK.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SWIFT_CORE_DIR="$REPO_ROOT/shared/swift-core"
JNILIBS_DIR="$REPO_ROOT/android/app/src/main/jniLibs"

# Prefer the open-source Swift 6.3 toolchain over the Xcode one.
OSS_TOOLCHAIN="$HOME/Library/Developer/Toolchains/swift-6.3-RELEASE.xctoolchain/usr/bin"
if [[ -x "$OSS_TOOLCHAIN/swift" ]]; then
    SWIFT="$OSS_TOOLCHAIN/swift"
else
    SWIFT="swift"
fi

# SDK artifact bundle path.
SDK_BUNDLE="$HOME/Library/org.swift.swiftpm/swift-sdks/swift-6.3-RELEASE_android.artifactbundle/swift-android"

# Swift runtime shared libraries required at runtime.
SWIFT_RUNTIME_LIBS="
libswiftCore.so
libswift_Concurrency.so
libswift_StringProcessing.so
libswift_RegexParser.so
libswift_Builtin_float.so
libswift_math.so
libswiftAndroid.so
libBlocksRuntime.so
libdispatch.so
libswiftDispatch.so
libFoundation.so
libFoundationEssentials.so
libFoundationInternationalization.so
lib_FoundationICU.so
libswiftSynchronization.so
libswiftSwiftOnoneSupport.so
"

build_arch() {
    local sdk_target="$1"
    local abi="$2"
    local runtime_subdir="$3"

    echo "Building for $abi ($sdk_target)..."

    "$SWIFT" build \
        --package-path "$SWIFT_CORE_DIR" \
        --swift-sdk "$sdk_target" \
        --product DevilsAIDictionaryCoreAndroidBridge \
        -c release 2>&1 | grep -v "^warning: multiple"

    local out_dir="$JNILIBS_DIR/$abi"
    mkdir -p "$out_dir"

    local build_dir="$SWIFT_CORE_DIR/.build/$sdk_target/release"
    cp "$build_dir/libDevilsAIDictionaryCoreAndroidBridge.so" "$out_dir/"

    local runtime_base="$SDK_BUNDLE/swift-resources/usr/lib/$runtime_subdir/android"
    for lib in $SWIFT_RUNTIME_LIBS; do
        if [[ -f "$runtime_base/$lib" ]]; then
            cp "$runtime_base/$lib" "$out_dir/"
        fi
    done

    echo "  -> $out_dir ($(ls "$out_dir"/*.so | wc -l | tr -d ' ') libraries)"
}

build_arch "aarch64-unknown-linux-android28" "arm64-v8a" "swift-aarch64"
build_arch "x86_64-unknown-linux-android28"  "x86_64"    "swift-x86_64"

echo "Swift Android build complete."
