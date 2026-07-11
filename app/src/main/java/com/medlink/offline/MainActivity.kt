package com.medlink.offline

import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.medlink.offline.nearby.NearbyManager
import com.medlink.offline.ui.navigation.Screen
import com.medlink.offline.ui.screens.*
import com.medlink.offline.ui.theme.MedLinkOfflineTheme
import com.medlink.offline.ui.viewmodel.ChatViewModel
import com.medlink.offline.ui.viewmodel.NearbyViewModel
import com.medlink.offline.ui.viewmodel.SettingsViewModel
import com.medlink.offline.util.PermissionHelper
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val nearbyViewModel: NearbyViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MedLinkOfflineTheme {
                var hasPermissions by remember { mutableStateOf(PermissionHelper.hasAllPermissions(this)) }

                val permissionLauncher = rememberLauncherForActivityResult(
                    contract = ActivityResultContracts.RequestMultiplePermissions()
                ) { results ->
                    hasPermissions = results.values.all { it }
                    if (!hasPermissions) {
                        Toast.makeText(this, "Permissions are required for Nearby Connections offline operations", Toast.LENGTH_LONG).show()
                    }
                }

                if (hasPermissions) {
                    MainNavigation(nearbyViewModel)
                } else {
                    PermissionRequestScreen {
                        permissionLauncher.launch(PermissionHelper.getRequiredPermissions())
                    }
                }
            }
        }
    }
}

@Composable
fun PermissionRequestScreen(onRequestPermissions: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = Icons.Default.Warning,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.error
            )
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "Permissions Required",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "MedLink Offline requires Camera, Storage, Bluetooth, WiFi, and Nearby Devices permissions to search, connect, and transfer medical photos locally without internet.",
                textAlign = TextAlign.Center,
                fontSize = 15.sp,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f)
            )
            Spacer(modifier = Modifier.height(32.dp))
            Button(
                onClick = onRequestPermissions,
                modifier = Modifier.fillMaxWidth(0.8f)
            ) {
                Text("Grant Permissions")
            }
        }
    }
}

@Composable
fun MainNavigation(nearbyViewModel: NearbyViewModel) {
    val navController = rememberNavController()
    val chatViewModel: ChatViewModel = hiltViewModel()
    val settingsViewModel: SettingsViewModel = hiltViewModel()

    val connectionRequest by nearbyViewModel.connectionRequest.collectAsState(initial = null)

    // Secure Verification Confirmation Dialog
    connectionRequest?.let { request ->
        AlertDialog(
            onDismissRequest = { request.onDecision(false) },
            title = { Text("Secure Connection Request") },
            text = {
                Column {
                    Text("Device '${request.endpointName}' wants to establish a secure offline channel.")
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Verification Code: ${request.authenticationToken}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            },
            confirmButton = {
                Button(onClick = { request.onDecision(true) }) {
                    Text("Accept")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { request.onDecision(false) }) {
                    Text("Reject")
                }
            }
        )
    }

    NavHost(
        navController = navController,
        startDestination = Screen.Home.route
    ) {
        composable(Screen.Home.route) {
            HomeScreen(
                nearbyViewModel = nearbyViewModel,
                onNavigateToNearby = { navController.navigate(Screen.NearbyDevices.route) },
                onNavigateToChat = { id, name -> navController.navigate(Screen.Chat.createRoute(id, name)) },
                onNavigateToSettings = { navController.navigate(Screen.Settings.route) }
            )
        }

        composable(Screen.NearbyDevices.route) {
            NearbyDevicesScreen(
                nearbyViewModel = nearbyViewModel,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToChat = { id, name -> navController.navigate(Screen.Chat.createRoute(id, name)) }
            )
        }

        composable(
            route = Screen.Chat.route,
            arguments = listOf(
                navArgument("endpointId") { type = NavType.StringType },
                navArgument("deviceName") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val endpointId = backStackEntry.arguments?.getString("endpointId") ?: ""
            val deviceName = backStackEntry.arguments?.getString("deviceName") ?: ""
            ChatScreen(
                endpointId = endpointId,
                deviceName = deviceName,
                chatViewModel = chatViewModel,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToImageViewer = { msgId -> navController.navigate(Screen.ImageViewer.createRoute(msgId)) }
            )
        }

        composable(
            route = Screen.ImageViewer.route,
            arguments = listOf(
                navArgument("messageId") { type = NavType.LongType }
            )
        ) { backStackEntry ->
            val messageId = backStackEntry.arguments?.getLong("messageId") ?: 0L
            ImageViewerScreen(
                messageId = messageId,
                chatViewModel = chatViewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Settings.route) {
            SettingsScreen(
                settingsViewModel = settingsViewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
