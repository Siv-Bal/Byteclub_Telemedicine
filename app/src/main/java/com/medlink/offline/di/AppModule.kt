package com.medlink.offline.di

import android.content.Context
import androidx.room.Room
import com.medlink.offline.data.local.ChatDao
import com.medlink.offline.data.local.MedLinkDatabase
import com.medlink.offline.data.repository.ChatRepository
import com.medlink.offline.data.repository.ChatRepositoryImpl
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): MedLinkDatabase {
        return Room.databaseBuilder(
            context,
            MedLinkDatabase::class.java,
            "medlink_offline.db"
        ).build()
    }

    @Provides
    @Singleton
    fun provideChatDao(database: MedLinkDatabase): ChatDao {
        return database.chatDao()
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindChatRepository(
        chatRepositoryImpl: ChatRepositoryImpl
    ): ChatRepository
}
