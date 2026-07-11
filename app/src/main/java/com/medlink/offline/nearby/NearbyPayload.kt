package com.medlink.offline.nearby

import kotlinx.serialization.Serializable

@Serializable
sealed class NearbyPayload {
    @Serializable
    data class Text(
        val messageId: Long,
        val text: String,
        val senderName: String,
        val timestamp: Long
    ) : NearbyPayload()

    @Serializable
    data class ImageMetadata(
        val messageId: Long,
        val fileName: String,
        val fileSize: Long,
        val filePayloadId: Long,
        val senderName: String,
        val timestamp: Long
    ) : NearbyPayload()
}
