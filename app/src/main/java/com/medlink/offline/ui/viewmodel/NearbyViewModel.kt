package com.medlink.offline.ui.viewmodel

import android.content.Context
import android.content.SharedPreferences
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.medlink.offline.data.repository.ChatRepository
import com.medlink.offline.nearby.NearbyManager
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class NearbyViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    val nearbyManager: NearbyManager,
    private val repository: ChatRepository
) : ViewModel() {

    private val sharedPrefs: SharedPreferences = context.getSharedPreferences("medlink_settings", Context.MODE_PRIVATE)

    val discoveredDevices = nearbyManager.discoveredDevices
    val connectionState = nearbyManager.connectionState
    val connectionRequest = nearbyManager.connectionRequest

    val connectionHistory = repository.getConnectionHistory()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        // Load configurations into NearbyManager
        nearbyManager.username = sharedPrefs.getString("username", android.os.Build.MODEL) ?: android.os.Build.MODEL
        nearbyManager.deviceName = sharedPrefs.getString("device_name", android.os.Build.MODEL) ?: android.os.Build.MODEL
    }

    fun startAdvertising() {
        viewModelScope.launch {
            nearbyManager.startAdvertising()
        }
    }

    fun stopAdvertising() {
        nearbyManager.stopAdvertising()
    }

    fun startDiscovery() {
        viewModelScope.launch {
            nearbyManager.startDiscovery()
        }
    }

    fun stopDiscovery() {
        nearbyManager.stopDiscovery()
    }

    fun connectToDevice(endpointId: String, endpointName: String) {
        viewModelScope.launch {
            nearbyManager.initiateConnection(endpointId, endpointName)
        }
    }

    fun disconnect(endpointId: String) {
        nearbyManager.disconnect(endpointId)
    }
}
