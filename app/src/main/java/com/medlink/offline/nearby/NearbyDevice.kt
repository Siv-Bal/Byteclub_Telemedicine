package com.medlink.offline.nearby

data class NearbyDevice(
    val endpointId: String,
    val deviceName: String,
    val status: DeviceStatus = DeviceStatus.DISCOVERED,
    val distance: String? = null // Distance isn't natively provided by Nearby Connections but we can placeholders
)

enum class DeviceStatus {
    DISCOVERED,
    CONNECTING,
    CONNECTED,
    REJECTED
}
