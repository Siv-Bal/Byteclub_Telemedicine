package com.medlink.offline.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Smartphone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.medlink.offline.ui.viewmodel.SettingsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    settingsViewModel: SettingsViewModel,
    onNavigateBack: () -> Unit
) {
    val username by settingsViewModel.username.collectAsState()
    val deviceName by settingsViewModel.deviceName.collectAsState()
    val autoDownload by settingsViewModel.autoDownload.collectAsState()
    val compressionQuality by settingsViewModel.compressionQuality.collectAsState()

    var editingUsername by remember { mutableStateOf(username) }
    var editingDeviceName by remember { mutableStateOf(deviceName) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
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
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Profile & Identity
            Text(
                "Identity Details",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )

            OutlinedTextField(
                value = editingUsername,
                onValueChange = {
                    editingUsername = it
                    settingsViewModel.saveUsername(it)
                },
                label = { Text("User Name") },
                leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = editingDeviceName,
                onValueChange = {
                    editingDeviceName = it
                    settingsViewModel.saveDeviceName(it)
                },
                label = { Text("Device Display Name") },
                leadingIcon = { Icon(Icons.Default.Smartphone, contentDescription = null) },
                modifier = Modifier.fillMaxWidth()
            )

            HorizontalDivider()

            // Transmissions
            Text(
                "Transmission Settings",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Auto-Download Images", fontWeight = FontWeight.SemiBold)
                    Text("Automatically receive image files locally", fontSize = 12.sp, color = Color.Gray)
                }
                Switch(
                    checked = autoDownload,
                    onCheckedChange = { settingsViewModel.saveAutoDownload(it) }
                )
            }

            Column {
                Text("Image Compression Quality", fontWeight = FontWeight.SemiBold)
                Text("Target quality percentage: $compressionQuality%", fontSize = 12.sp, color = Color.Gray)
                Spacer(modifier = Modifier.height(8.dp))
                Slider(
                    value = compressionQuality.toFloat(),
                    onValueChange = { settingsViewModel.saveCompressionQuality(it.toInt()) },
                    valueRange = 50f..100f,
                    steps = 9
                )
            }

            HorizontalDivider()

            // About section
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = "About",
                        tint = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.size(32.dp)
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text(
                            "MedLink Offline v1.0.0",
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Text(
                            "Designed for remote clinical response, humanitarian aid, and disaster zones. Communication operates strictly over Google's local P2P Nearby Connections protocol. No internet required.",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                        )
                    }
                }
            }
        }
    }
}
