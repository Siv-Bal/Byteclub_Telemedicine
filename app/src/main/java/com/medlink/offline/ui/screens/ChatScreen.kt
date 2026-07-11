package com.medlink.offline.ui.screens

import android.net.Uri
import android.os.Environment
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import coil.compose.AsyncImage
import com.medlink.offline.data.local.MessageEntity
import com.medlink.offline.nearby.NearbyManager
import com.medlink.offline.ui.viewmodel.ChatViewModel
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    endpointId: String,
    deviceName: String,
    chatViewModel: ChatViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToImageViewer: (Long) -> Unit
) {
    val context = LocalContext.current
    val messages by chatViewModel.messages.collectAsState()
    val progressMap by chatViewModel.transferProgress.collectAsState()

    var textState by remember { mutableStateOf("") }
    var showAttachmentMenu by remember { mutableStateOf(false) }

    // Set endpoint in viewmodel
    LaunchedEffect(endpointId) {
        chatViewModel.setEndpointId(endpointId)
    }

    // Photo capture Uri setup
    var photoUri by remember { mutableStateOf<Uri?>(null) }
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        if (success && photoUri != null) {
            chatViewModel.sendImage(photoUri!!)
        }
    }

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            chatViewModel.sendImage(uri)
        }
    }

    fun triggerCamera() {
        val cacheDir = context.cacheDir
        val tempFile = File.createTempFile("medlink_capture_", ".jpg", cacheDir)
        val uri = FileProvider.getUriForFile(context, "com.medlink.offline.fileprovider", tempFile)
        photoUri = uri
        cameraLauncher.launch(uri)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(deviceName, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Text("Connected Offline", fontSize = 12.sp, color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f))
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { chatViewModel.nearbyManager.disconnect(endpointId); onNavigateBack() }) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Disconnect")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary,
                    actionIconContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.background)
        ) {
            // Message List
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp),
                reverseLayout = false,
                contentPadding = PaddingValues(vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(messages) { message ->
                    val transferProgress = progressMap.values.find { it.messageId == message.id }
                    MessageBubble(
                        message = message,
                        progress = transferProgress,
                        onImageClick = {
                            if (message.imagePath != null) {
                                onNavigateToImageViewer(message.id)
                            }
                        }
                    )
                }
            }

            // Attachment Bar if visible
            AnimatedVisibility(visible = showAttachmentMenu) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surface)
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceAround
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.clickable {
                            showAttachmentMenu = false
                            triggerCamera()
                        }
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                            modifier = Modifier.size(56.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.PhotoCamera,
                                contentDescription = "Camera",
                                modifier = Modifier.padding(16.dp),
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Camera", fontSize = 12.sp)
                    }

                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.clickable {
                            showAttachmentMenu = false
                            galleryLauncher.launch("image/*")
                        }
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                            modifier = Modifier.size(56.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Image,
                                contentDescription = "Gallery",
                                modifier = Modifier.padding(16.dp),
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Gallery", fontSize = 12.sp)
                    }
                }
            }

            // Bottom Input Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { showAttachmentMenu = !showAttachmentMenu }) {
                    Icon(
                        imageVector = if (showAttachmentMenu) Icons.Default.Close else Icons.Default.AttachFile,
                        contentDescription = "Attachment",
                        tint = MaterialTheme.colorScheme.primary
                    )
                }

                TextField(
                    value = textState,
                    onValueChange = { textState = it },
                    placeholder = { Text("Write offline message...") },
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 8.dp),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        disabledContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent
                    ),
                    maxLines = 4
                )

                IconButton(
                    onClick = {
                        if (textState.trim().isNotEmpty()) {
                            chatViewModel.sendMessage(textState)
                            textState = ""
                        }
                    },
                    colors = IconButtonDefaults.iconButtonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    ),
                    modifier = Modifier.size(44.dp)
                ) {
                    Icon(imageVector = Icons.Default.Send, contentDescription = "Send")
                }
            }
        }
    }
}

@Composable
fun MessageBubble(
    message: MessageEntity,
    progress: NearbyManager.TransferProgressInfo?,
    onImageClick: () -> Unit
) {
    val isIncoming = message.isIncoming
    val bubbleColor = if (isIncoming) {
        MaterialTheme.colorScheme.surfaceVariant
    } else {
        MaterialTheme.colorScheme.primary
    }
    val contentColor = if (isIncoming) {
        MaterialTheme.colorScheme.onSurfaceVariant
    } else {
        MaterialTheme.colorScheme.onPrimary
    }

    val bubbleShape = if (isIncoming) {
        RoundedCornerShape(16.dp, 16.dp, 16.dp, 4.dp)
    } else {
        RoundedCornerShape(16.dp, 16.dp, 4.dp, 16.dp)
    }

    val alignment = if (isIncoming) Alignment.Start else Alignment.End

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalAlignment = alignment
    ) {
        Surface(
            color = bubbleColor,
            shape = bubbleShape,
            shadowElevation = 1.dp
        ) {
            Column(
                modifier = Modifier
                    .padding(12.dp)
                    .widthIn(max = 260.dp)
            ) {
                // Image payload display
                if (message.imagePath != null) {
                    val isPending = message.imagePath == "PENDING"
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(180.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .clickable(enabled = !isPending, onClick = onImageClick)
                            .background(Color.DarkGray),
                        contentAlignment = Alignment.Center
                    ) {
                        if (isPending) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                CircularProgressIndicator(color = contentColor, modifier = Modifier.size(32.dp))
                                Spacer(modifier = Modifier.height(8.dp))
                                Text("Receiving image...", fontSize = 12.sp, color = contentColor)
                            }
                        } else {
                            val file = File(message.imagePath)
                            if (file.exists()) {
                                AsyncImage(
                                    model = file,
                                    contentDescription = "Received image",
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                            } else {
                                Icon(imageVector = Icons.Default.BrokenImage, contentDescription = "Error", tint = Color.LightGray)
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                }

                // Text payload display
                if (!message.messageText.isNullOrEmpty()) {
                    Text(
                        text = message.messageText,
                        color = contentColor,
                        fontSize = 15.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                }

                // File/Image upload or download progress indicator
                if (progress != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = if (progress.isUploading) {
                            "Uploading: ${progress.percent.toInt()}% (${progress.speedKbps.toInt()} KB/s)"
                        } else {
                            "Receiving: ${progress.percent.toInt()}% (${progress.speedKbps.toInt()} KB/s)"
                        },
                        fontSize = 11.sp,
                        color = contentColor.copy(alpha = 0.8f),
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    LinearProgressIndicator(
                        progress = { progress.percent / 100f },
                        modifier = Modifier.fillMaxWidth(),
                        color = if (isIncoming) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onPrimary,
                        trackColor = contentColor.copy(alpha = 0.2f),
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "ETA: ${progress.etaSeconds}s",
                        fontSize = 10.sp,
                        color = contentColor.copy(alpha = 0.6f)
                    )
                }

                // Bottom row details (Time, Status)
                Row(
                    modifier = Modifier.align(Alignment.End),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val timeFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())
                    Text(
                        text = timeFormat.format(Date(message.timestamp)),
                        fontSize = 10.sp,
                        color = contentColor.copy(alpha = 0.6f)
                    )
                    if (!isIncoming) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            imageVector = when (message.deliveryStatus) {
                                "Sending" -> Icons.Default.Schedule
                                "Sent" -> Icons.Default.Done
                                "Received" -> Icons.Default.DoneAll
                                else -> Icons.Default.ErrorOutline
                            },
                            contentDescription = message.deliveryStatus,
                            modifier = Modifier.size(12.dp),
                            tint = contentColor.copy(alpha = 0.6f)
                        )
                    }
                }
            }
        }
    }
}
