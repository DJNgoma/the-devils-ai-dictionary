package com.djngoma.devilsaidictionary

import android.content.Context
import java.io.File

internal class CatalogDiskStore(
    context: Context,
) {
    private val catalogDirectory = File(context.filesDir, "catalog")
    private val catalogFile = File(catalogDirectory, "entries.generated.json")
    private val tempFile = File(catalogDirectory, "entries.generated.json.tmp")

    fun readCatalogBytes(): ByteArray? {
        if (!catalogFile.exists()) {
            return null
        }

        return catalogFile.readBytes()
    }

    fun writeCatalogBytes(bytes: ByteArray) {
        if (!catalogDirectory.exists()) {
            catalogDirectory.mkdirs()
        }

        tempFile.writeBytes(bytes)

        if (catalogFile.exists() && !catalogFile.delete()) {
            throw IllegalStateException("Could not replace the cached Android catalogue.")
        }

        if (!tempFile.renameTo(catalogFile)) {
            tempFile.delete()
            throw IllegalStateException("Could not atomically replace the cached Android catalogue.")
        }
    }

    fun clear() {
        if (tempFile.exists()) {
            tempFile.delete()
        }
        if (catalogFile.exists()) {
            catalogFile.delete()
        }
    }
}
