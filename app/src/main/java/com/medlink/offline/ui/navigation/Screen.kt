package com.medlink.offline.ui.navigation

sealed class Screen(val route: String) {
    object Home : Screen("home")
    object NearbyDevices : Screen("nearby_devices")
    object Chat : Screen("chat/{endpointId}/{deviceName}") {
        fun createRoute(endpointId: String, deviceName: String): String {
            return "chat/$endpointId/$deviceName"
        }
    }
    object ImageViewer : Screen("image_viewer/{messageId}") {
        fun createRoute(messageId: Long): String {
            return "image_viewer/$messageId"
        }
    }
    object Settings : Screen("settings")
}
