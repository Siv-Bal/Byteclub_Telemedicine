package com.medlink.offline.ui.viewmodel

import android.content.Context
import android.content.SharedPreferences
import androidx.lifecycle.ViewModel
import com.medlink.offline.nearby.NearbyManager
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val nearbyManager: NearbyManager
) : ViewModel() {

    private val sharedPrefs: SharedPreferences = context.getSharedPreferences("medlink_settings", Context.MODE_PRIVATE)

    private val _username = MutableStateFlow(sharedPrefs.getString("username", android.os.Build.MODEL) ?: android.os.Build.MODEL)
    val username: StateFlow<String> = _username

    private val _deviceName = MutableStateFlow(sharedPrefs.getString("device_name", android.os.Build.MODEL) ?: android.os.Build.MODEL)
    val deviceName: StateFlow<String> = _deviceName

    private val _autoDownload = MutableStateFlow(sharedPrefs.getBoolean("auto_download_images", true))
    val autoDownload: StateFlow<Boolean> = _autoDownload

    private val _compressionQuality = MutableStateFlow(sharedPrefs.getInt("compression_quality", 80))
    val compressionQuality: StateFlow<Int> = _compressionQuality

    fun saveUsername(name: String) {
        _username.value = name
        sharedPrefs.edit().putString("username", name).apply()
        nearbyManager.username = name
    }

    fun saveDeviceName(name: String) {
        _deviceName.value = name
        sharedPrefs.edit().putString("device_name", name).apply()
        nearbyManager.deviceName = name
    }

    fun saveAutoDownload(value: Boolean) {
        _autoDownload.value = value
        sharedPrefs.edit().putBoolean("auto_download_images", value).apply()
    }

    fun saveCompressionQuality(quality: Int) {
        _compressionQuality.value = quality
        sharedPrefs.edit().putInt("compression_quality", quality).apply()
    }
}
