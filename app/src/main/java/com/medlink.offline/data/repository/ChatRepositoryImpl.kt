package com.medlink.offline.data.repository

import com.medlink.offline.data.local.ChatDao
import com.medlink.offline.data.local.ConnectionHistoryEntity
import com.medlink.offline.data.local.MessageEntity
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ChatRepositoryImpl @Inject constructor(
    private val chatDao: ChatDao
) : ChatRepository {

    override fun getAllMessages(): Flow<List<MessageEntity>> =
        chatDao.getAllMessages()

    override fun getMessagesForEndpoint(endpointId: String): Flow<List<MessageEntity>> =
        chatDao.getMessagesForEndpoint(endpointId)

    override suspend fun insertMessage(message: MessageEntity): Long =
        chatDao.insertMessage(message)

    override suspend fun updateMessage(message: MessageEntity) =
        chatDao.updateMessage(message)

    override suspend fun updateDeliveryStatus(id: Long, status: String) =
        chatDao.updateDeliveryStatus(id, status)

    override suspend fun updateTransferProgress(id: Long, progress: Int) =
        chatDao.updateTransferProgress(id, progress)

    override fun getConnectionHistory(): Flow<List<ConnectionHistoryEntity>> =
        chatDao.getConnectionHistory()

    override suspend fun insertConnectionHistory(history: ConnectionHistoryEntity): Long =
        chatDao.insertConnectionHistory(history)
}
