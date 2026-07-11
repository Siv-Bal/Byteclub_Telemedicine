package com.medlink.offline.data.repository

import com.medlink.offline.data.local.ConnectionHistoryEntity
import com.medlink.offline.data.local.MessageEntity
import kotlinx.coroutines.flow.Flow

interface ChatRepository {
    fun getAllMessages(): Flow<List<MessageEntity>>
    fun getMessagesForEndpoint(endpointId: String): Flow<List<MessageEntity>>
    suspend fun insertMessage(message: MessageEntity): Long
    suspend fun updateMessage(message: MessageEntity)
    suspend fun updateDeliveryStatus(id: Long, status: String)
    suspend fun updateTransferProgress(id: Long, progress: Int)
    fun getConnectionHistory(): Flow<List<ConnectionHistoryEntity>>
    suspend fun insertConnectionHistory(history: ConnectionHistoryEntity): Long
}
