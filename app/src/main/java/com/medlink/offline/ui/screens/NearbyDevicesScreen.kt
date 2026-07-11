package com.medlink.offline.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Radar
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.medlink.offline.nearby.DeviceStatus
import com.medlink.offline.nearby.NearbyDevice
import com.medlink.offline.nearby.NearbyManager
import com.medlink.offline.ui.viewmodel.NearbyViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NearbyDevicesScreen(
    nearbyViewModel: NearbyViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToChat: (String, String) -> Unit
) {
    val discoveredDevices by nearbyViewModel.discoveredDevices.collectAsState()
    val connectionState by nearbyViewModel.connectionState.collectAsState()

    var isAdvertising by remember { mutableStateOf(false) }
    var isDiscovering by remember { mutableStateOf(false) }

    // Sync isAdvertising and isDiscovering switches with connectionState
    LaunchedEffect(connectionState) {
        when (connectionState) {
            is NearbyManager.ConnectionState.Advertising -> {
                isAdvertising = true
                isDiscovering = false
            }
            is NearbyManager.ConnectionState.Discovering -> {
                isAdvertising = false
                isDiscovering = true
            }
            is NearbyManager.ConnectionState.Connected -> {
                val state = connectionState as NearbyManager.ConnectionState.Connected
                // Automatically redirect to Chat once connected
                onNavigateToChat(state.endpointId, state.endpointName)
            }
            else -> {
                isAdvertising = false
                isDiscovering = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Nearby Devices") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Advertising Controls
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Visible to others", fontWeight = FontWeight.Bold)
                        Text("Allow other healthcare workers to find you", fontSize = 12.sp, color = Color.Gray)
                    }
                    Switch(
                        checked = isAdvertising,
                        onCheckedChange = { checked ->
                            if (checked) {
                                nearbyViewModel.startAdvertising()
                            } else {
                                nearbyViewModel.stopAdvertising()
                            }
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Discovery Controls
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Scan for devices", fontWeight = FontWeight.Bold)
                        Text("Find active devices nearby", fontSize = 12.sp, color = Color.Gray)
                    }
                    Switch(
                        checked = isDiscovering,
                        onCheckedChange = { checked ->
                            if (checked) {
                                nearbyViewModel.startDiscovery()
                            } else {
                                nearbyViewModel.stopDiscovery()
                            }
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Scanning Animation
            if (isDiscovering) {
                RadarAnimation()
                Spacer(modifier = Modifier.height(24.dp))
            }

            // Discovered Devices List
            Text(
                text = "Discovered Devices",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.align(Alignment.Start),
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(8.dp))

            if (discoveredDevices.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (isDiscovering) "Searching for nearby devices..." else "Turn on scanner to discover devices",
                        color = Color.Gray,
                        fontSize = 14.sp
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(discoveredDevices) { device ->
                        DeviceItemRow(device = device) {
                            nearbyViewModel.connectToDevice(device.endpointId, device.deviceName)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun DeviceItemRow(device: NearbyDevice, onConnect: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(device.deviceName, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(
                    text = when (device.status) {
                        DeviceStatus.DISCOVERED -> "Tap to connect"
                        DeviceStatus.CONNECTING -> "Connecting..."
                        DeviceStatus.CONNECTED -> "Connected"
                        DeviceStatus.REJECTED -> "Rejected"
                    },
                    fontSize = 12.sp,
                    color = when (device.status) {
                        DeviceStatus.CONNECTED -> MaterialTheme.colorScheme.primary
                        DeviceStatus.CONNECTING -> Color.Blue
                        else -> Color.Gray
                    }
                )
            }
            Button(
                onClick = onConnect,
                enabled = device.status == DeviceStatus.DISCOVERED,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Text(if (device.status == DeviceStatus.CONNECTING) "Connecting" else "Connect")
            }
        }
    }
}

@Composable
fun RadarAnimation() {
    val infiniteTransition = rememberInfiniteTransition(label = "Radar")
    val scale by infiniteTransition.animateFloat(
        initialValue = 0.5f,
        targetValue = 1.8f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "RadarScale"
    )
    val alpha by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 0.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "RadarAlpha"
    )

    Box(
        modifier = Modifier
            .size(100.dp),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .scale(scale)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary.copy(alpha = alpha))
        )
        Box(
            modifier = Modifier
                .size(50.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Radar,
                contentDescription = "Radar Icon",
                tint = Color.White
            )
        }
    }
}
