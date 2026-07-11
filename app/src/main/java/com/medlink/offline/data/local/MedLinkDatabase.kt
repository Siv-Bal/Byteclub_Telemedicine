package com.medlink.offline.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [MessageEntity::class, ConnectionHistoryEntity::class],
    version = 1,
    exportSchema = false
)
abstract class MedLinkDatabase : RoomDatabase() {
    abstract fun chatDao(): ChatDao
}
