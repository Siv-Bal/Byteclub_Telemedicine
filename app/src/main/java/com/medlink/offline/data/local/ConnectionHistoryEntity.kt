package com.medlink.offline.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "connection_history")
data class ConnectionHistoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val endpointId: String,
    val deviceName: String,
    val connectionStatus: String, // "Connected", "Disconnected"
    val timestamp: Long
)
