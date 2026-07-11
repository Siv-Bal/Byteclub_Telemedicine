package com.medlink.offline.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "messages")
data class MessageEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val senderName: String,
    val senderEndpointId: String,
    val messageText: String?,
    val imagePath: String?,
    val timestamp: Long,
    val deliveryStatus: String, // "Sending", "Sent", "Received", "Failed"
    val transferProgress: Int = 0, // 0 to 100 for tracking image upload/download progress
    val isIncoming: Boolean
)
