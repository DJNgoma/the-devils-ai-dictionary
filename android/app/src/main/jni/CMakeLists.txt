cmake_minimum_required(VERSION 3.22)
project(swift_bridge_jni C)

add_library(swift_bridge_jni SHARED swift_bridge_jni.c)

# The Swift bridge .so lives in jniLibs alongside this library at runtime.
# Link by name so the dynamic linker resolves it from the same directory.
target_link_libraries(swift_bridge_jni
    DevilsAIDictionaryCoreAndroidBridge
    log
)

# Tell the linker where to find the .so at build time.
target_link_directories(swift_bridge_jni PRIVATE
    ${CMAKE_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}
)
