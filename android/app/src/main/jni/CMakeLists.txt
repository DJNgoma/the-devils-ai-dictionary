cmake_minimum_required(VERSION 3.22)
project(swift_bridge_jni C)

add_library(swift_bridge_jni SHARED swift_bridge_jni.c)

# Link against the pre-built Swift bridge .so in jniLibs.
add_library(DevilsAIDictionaryCoreAndroidBridge SHARED IMPORTED)
set_target_properties(DevilsAIDictionaryCoreAndroidBridge PROPERTIES
    IMPORTED_LOCATION ${CMAKE_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}/libDevilsAIDictionaryCoreAndroidBridge.so
)

target_link_libraries(swift_bridge_jni
    DevilsAIDictionaryCoreAndroidBridge
    log
)
