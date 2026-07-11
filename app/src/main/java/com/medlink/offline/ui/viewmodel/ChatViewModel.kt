package com.medlink.offline.ui.viewmodel

import android.content.Context
import android.content.SharedPreferences
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.medlink.offline.data.local.MessageEntity
import com.medlink.offline.data.repository.ChatRepository
import com.medlink.offline.nearby.NearbyManager
import com.medlink.offline.util.ImageCompressor
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.io.File
import javax.inject.Inject

@HiltViewModel
class ChatViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val repository: ChatRepository,
    val nearbyManager: NearbyManager
) : ViewModel() {

    private val sharedPrefs: SharedPreferences = context.getSharedPreferences("medlink_settings", Context.MODE_PRIVATE)

    private val _currentEndpointId = MutableStateFlow("")
    val currentEndpointId: StateFlow<String> = _currentEndpointId

    val messages = _currentEndpointId.flatMapLatest { endpointId ->
        repository.getMessagesForEndpoint(endpointId)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val transferProgress = nearbyManager.transferProgress

    fun setEndpointId(endpointId: String) {
        _currentEndpointId.value = endpointId
    }

    fun sendMessage(text: String) {
        val endpointId = _currentEndpointId.value
        if (endpointId.isNotEmpty() && text.trim().isNotEmpty()) {
            nearbyManager.sendText(endpointId, text)
        }
    }

    fun sendImage(uri: Uri) {
        val endpointId = _currentEndpointId.value
        if (endpointId.isEmpty()) return

        viewModelScope.launch(Dispatchers.IO) {
            val quality = sharedPrefs.getInt("compression_quality", 80)
            val compressedFile = ImageCompressor.compressImage(context, uri, targetQuality = quality)
            if (compressedFile != null && compressedFile.exists()) {
                nearbyManager.sendImage(endpointId, compressedFile)
            }
        }
    }

    fun getMessageById(messageId: Long): MessageEntity? {
        // Simple search in current active messages
        return messages.value.find { it.id == messageId }
    }
}
