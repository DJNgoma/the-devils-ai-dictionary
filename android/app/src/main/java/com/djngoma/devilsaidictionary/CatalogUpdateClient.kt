package com.djngoma.devilsaidictionary

import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

internal sealed interface CatalogUpdateResult {
    data class NoChange(
        val checkedAtMs: Long,
    ) : CatalogUpdateResult

    data class Updated(
        val checkedAtMs: Long,
        val manifest: CatalogManifest,
        val snapshot: CatalogSnapshot,
        val bytes: ByteArray,
    ) : CatalogUpdateResult

    data class UnsupportedSchema(
        val checkedAtMs: Long,
        val schemaVersion: Int,
    ) : CatalogUpdateResult
}

internal data class CatalogManifestFetchResult(
    val checkedAtMs: Long,
    val manifest: CatalogManifest,
)

internal class CatalogUpdateClient(
    private val manifestUrl: URL,
) {
    fun manifestUrlString(): String = manifestUrl.toString()

    fun fetchManifest(): CatalogManifestFetchResult {
        val checkedAtMs = System.currentTimeMillis()
        val manifestBytes = fetchBytes(manifestUrl)
        val manifest = parseCatalogManifest(JSONObject(String(manifestBytes, Charsets.UTF_8)))
        return CatalogManifestFetchResult(
            checkedAtMs = checkedAtMs,
            manifest = manifest,
        )
    }

    fun fetchUpdate(currentCatalogVersion: String?): CatalogUpdateResult {
        val manifestResult = fetchManifest()
        val checkedAtMs = manifestResult.checkedAtMs
        val manifest = manifestResult.manifest

        if (!supportsCatalogSchema(manifest.schemaVersion)) {
            return CatalogUpdateResult.UnsupportedSchema(
                checkedAtMs = checkedAtMs,
                schemaVersion = manifest.schemaVersion,
            )
        }

        if (manifest.catalogVersion == currentCatalogVersion) {
            return CatalogUpdateResult.NoChange(checkedAtMs = checkedAtMs)
        }

        val snapshotUrl = resolveCatalogUrl(manifestUrl, manifest.snapshotPath)
        val snapshotBytes = fetchBytes(snapshotUrl)
        val actualSha256 = sha256Hex(snapshotBytes)
        check(actualSha256 == manifest.sha256) {
            "The downloaded Android catalogue failed hash verification."
        }

        val snapshot = parseCatalogSnapshot(snapshotBytes)
        check(supportsCatalogSchema(snapshot.schemaVersion)) {
            "The downloaded Android catalogue requires schema ${snapshot.schemaVersion}."
        }
        check(snapshot.catalogVersion == manifest.catalogVersion) {
            "The downloaded Android catalogue version did not match the manifest."
        }

        return CatalogUpdateResult.Updated(
            checkedAtMs = checkedAtMs,
            manifest = manifest,
            snapshot = snapshot,
            bytes = snapshotBytes,
        )
    }

    private fun fetchBytes(url: URL): ByteArray {
        val connection = (url.openConnection() as HttpURLConnection).apply {
            connectTimeout = 10_000
            readTimeout = 10_000
            requestMethod = "GET"
            setRequestProperty("Accept", "application/json")
        }

        try {
            connection.connect()
            val responseCode = connection.responseCode
            if (responseCode !in 200..299) {
                throw IOException("The Android catalogue request failed with HTTP $responseCode.")
            }

            return connection.inputStream.use { input -> input.readBytes() }
        } finally {
            connection.disconnect()
        }
    }
}

internal fun resolveCatalogUrl(manifestUrl: URL, path: String): URL =
    URL(manifestUrl, path)
