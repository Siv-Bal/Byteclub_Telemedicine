package com.medlink.offline.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface ChatDao {

    @Query("SELECT * FROM messages ORDER BY timestamp ASC")
    fun getAllMessages(): Flow<List<MessageEntity>>

    @Query("SELECT * FROM messages WHERE senderEndpointId = :endpointId ORDER BY timestamp ASC")
    fun getMessagesForEndpoint(endpointId: String): Flow<List<MessageEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: MessageEntity): Long

    @Update
    suspend fun updateMessage(message: MessageEntity)

    @Query("UPDATE messages SET deliveryStatus = :status WHERE id = :id")
    suspend fun updateDeliveryStatus(id: Long, status: String)

    @Query("UPDATE messages SET transferProgress = :progress WHERE id = :id")
    suspend fun updateTransferProgress(id: Long, progress: Int)

    @Query("SELECT * FROM connection_history ORDER BY timestamp DESC")
    fun getConnectionHistory(): Flow<List<ConnectionHistoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertConnectionHistory(history: ConnectionHistoryEntity): Long
}
