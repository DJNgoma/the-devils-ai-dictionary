/**
 * JNI glue between Kotlin (SwiftCoreBridge.kt) and the @_cdecl exports
 * in libDevilsAIDictionaryCoreAndroidBridge.so.
 *
 * Each function converts JNI types (jbyteArray, jstring) to C types,
 * calls the Swift bridge, and converts the result back.
 */
#include <jni.h>
#include <stdlib.h>
#include <string.h>

/* Forward declarations of the Swift @_cdecl exports. */
extern void *daid_catalog_decode(const unsigned char *bytes, int length);
extern void  daid_catalog_free(void *handle);
extern char *daid_catalog_entry_json(void *handle, const char *slug);
extern char *daid_catalog_featured_json(void *handle);
extern char *daid_catalog_daily_word_json(void *handle, long long epochSeconds);
extern char *daid_catalog_daily_word_slug(void *handle, long long epochSeconds);
extern char *daid_catalog_random_json(void *handle, const char *excludingSlug);
extern char *daid_catalog_recent_json(void *handle, int limit);
extern char *daid_catalog_misunderstood_json(void *handle, int limit);
extern char *daid_catalog_all_entries_json(void *handle);
extern char *daid_catalog_entries_for_slugs_json(void *handle, const char *slugsJSON);
extern char *daid_catalog_filter_json(void *handle, const char *filterJSON);
extern char *daid_catalog_metadata_json(void *handle);
extern void  daid_free_string(char *ptr);

/* Helper: convert a C string from Swift into a jstring and free the C string. */
static jstring take_string(JNIEnv *env, char *cstr) {
    if (!cstr) return NULL;
    jstring result = (*env)->NewStringUTF(env, cstr);
    daid_free_string(cstr);
    return result;
}

#define JNI_FN(name) Java_com_djngoma_devilsaidictionary_SwiftCoreBridge_##name

JNIEXPORT jlong JNICALL
JNI_FN(nativeCatalogDecode)(JNIEnv *env, jobject thiz, jbyteArray bytes) {
    jsize len = (*env)->GetArrayLength(env, bytes);
    jbyte *buf = (*env)->GetByteArrayElements(env, bytes, NULL);
    void *handle = daid_catalog_decode((const unsigned char *)buf, (int)len);
    (*env)->ReleaseByteArrayElements(env, bytes, buf, JNI_ABORT);
    return (jlong)(intptr_t)handle;
}

JNIEXPORT void JNICALL
JNI_FN(nativeCatalogFree)(JNIEnv *env, jobject thiz, jlong handle) {
    if (handle) daid_catalog_free((void *)(intptr_t)handle);
}

JNIEXPORT jstring JNICALL
JNI_FN(nativeCatalogEntryJson)(JNIEnv *env, jobject thiz, jlong handle, jstring slug) {
    const char *cslug = (*env)->GetStringUTFChars(env, slug, NULL);
    char *result = daid_catalog_entry_json((void *)(intptr_t)handle, cslug);
    (*env)->ReleaseStringUTFChars(env, slug, cslug);
    return take_string(env, result);
}

JNIEXPORT jstring JNICALL
JNI_FN(nativeCatalogFeaturedJson)(JNIEnv *env, jobject thiz, jlong handle) {
    return take_string(env, daid_catalog_featured_json((void *)(intptr_t)handle));
}

JNIEXPORT jstring JNICALL
JNI_FN(nativeCatalogDailyWordJson)(JNIEnv *env, jobject thiz, jlong handle, jlong epochSeconds) {
    return take_string(env, daid_catalog_daily_word_json((void *)(intptr_t)handle, (long long)epochSeconds));
}

JNIEXPORT jstring JNICALL
JNI_FN(nativeCatalogDailyWordSlug)(JNIEnv *env, jobject thiz, jlong handle, jlong epochSeconds) {
    return take_string(env, daid_catalog_daily_word_slug((void *)(intptr_t)handle, (long long)epochSeconds));
}

JNIEXPORT jstring JNICALL
JNI_FN(nativeCatalogRandomJson)(JNIEnv *env, jobject thiz, jlong handle, jstring excludingSlug) {
    const char *cexcl = excludingSlug ? (*env)->GetStringUTFChars(env, excludingSlug, NULL) : NULL;
    char *result = daid_catalog_random_json((void *)(intptr_t)handle, cexcl);
    if (cexcl) (*env)->ReleaseStringUTFChars(env, excludingSlug, cexcl);
    return take_string(env, result);
}

JNIEXPORT jstring JNICALL
JNI_FN(nativeCatalogRecentJson)(JNIEnv *env, jobject thiz, jlong handle, jint limit) {
    return take_string(env, daid_catalog_recent_json((void *)(intptr_t)handle, (int)limit));
}

JNIEXPORT jstring JNICALL
JNI_FN(nativeCatalogMisunderstoodJson)(JNIEnv *env, jobject thiz, jlong handle, jint limit) {
    return take_string(env, daid_catalog_misunderstood_json((void *)(intptr_t)handle, (int)limit));
}

JNIEXPORT jstring JNICALL
JNI_FN(nativeCatalogAllEntriesJson)(JNIEnv *env, jobject thiz, jlong handle) {
    return take_string(env, daid_catalog_all_entries_json((void *)(intptr_t)handle));
}

JNIEXPORT jstring JNICALL
JNI_FN(nativeCatalogEntriesForSlugsJson)(JNIEnv *env, jobject thiz, jlong handle, jstring slugsJson) {
    const char *cslugs = (*env)->GetStringUTFChars(env, slugsJson, NULL);
    char *result = daid_catalog_entries_for_slugs_json((void *)(intptr_t)handle, cslugs);
    (*env)->ReleaseStringUTFChars(env, slugsJson, cslugs);
    return take_string(env, result);
}

JNIEXPORT jstring JNICALL
JNI_FN(nativeCatalogFilterJson)(JNIEnv *env, jobject thiz, jlong handle, jstring filterJson) {
    const char *cfilter = (*env)->GetStringUTFChars(env, filterJson, NULL);
    char *result = daid_catalog_filter_json((void *)(intptr_t)handle, cfilter);
    (*env)->ReleaseStringUTFChars(env, filterJson, cfilter);
    return take_string(env, result);
}

JNIEXPORT jstring JNICALL
JNI_FN(nativeCatalogMetadataJson)(JNIEnv *env, jobject thiz, jlong handle) {
    return take_string(env, daid_catalog_metadata_json((void *)(intptr_t)handle));
}
