package com.medlink.offline.nearby

import android.content.Context
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.os.SystemClock
import android.util.Log
import androidx.core.content.FileProvider
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.*
import com.medlink.offline.data.local.ChatDao
import com.medlink.offline.data.local.MessageEntity
import com.medlink.offline.data.local.ConnectionHistoryEntity
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.json.Json
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NearbyManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val chatDao: ChatDao
) {
    private val TAG = "NearbyManager"
    private val SERVICE_ID = "com.medlink.offline.SERVICE_ID"
    private val STRATEGY = Strategy.P2P_POINT_TO_POINT

    private val connectionsClient = Nearby.getConnectionsClient(context)
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    // UI State flows
    private val _discoveredDevices = MutableStateFlow<List<NearbyDevice>>(emptyList())
    val discoveredDevices: StateFlow<List<NearbyDevice>> = _discoveredDevices

    private val _connectionState = MutableStateFlow<ConnectionState>(ConnectionState.Idle)
    val connectionState: StateFlow<ConnectionState> = _connectionState

    // Dialog trigger for connection requests
    private val _connectionRequest = MutableStateFlow<ConnectionRequest?>(null)
    val connectionRequest: StateFlow<ConnectionRequest?> = _connectionRequest

    // Progress updates mapping payloadId -> ProgressInfo
    private val _transferProgress = MutableStateFlow<Map<Long, TransferProgressInfo>>(emptyMap())
    val transferProgress: StateFlow<Map<Long, TransferProgressInfo>> = _transferProgress

    // User settings
    var username: String = "Healthcare Worker"
    var deviceName: String = android.os.Build.MODEL

    // Keep track of metadata for received files: filePayloadId -> ImageMetadata
    private val receivedMetadata = mutableMapOf<Long, NearbyPayload.ImageMetadata>()
    // Keep track of started transfer timestamps to calculate speed: payloadId -> startTimeMillis
    private val transferStartTimes = mutableMapOf<Long, Long>()
    // Keep track of incoming file payloads to retrieve them in update callback
    private val incomingFilePayloads = mutableMapOf<Long, Payload>()
    // Keep track of outgoing/incoming payloadId to local messageId for status/progress updates
    private val payloadIdToMessageId = mutableMapOf<Long, Long>()

    data class ConnectionRequest(
        val endpointId: String,
        val endpointName: String,
        val authenticationToken: String,
        val onDecision: (Boolean) -> Unit
    )

    data class TransferProgressInfo(
        val messageId: Long,
        val bytesTransferred: Long,
        val totalBytes: Long,
        val percent: Float,
        val speedKbps: Double,
        val etaSeconds: Long,
        val isUploading: Boolean
    )

    sealed class ConnectionState {
        object Idle : ConnectionState()
        object Advertising : ConnectionState()
        object Discovering : ConnectionState()
        data class Connecting(val endpointId: String, val endpointName: String) : ConnectionState()
        data class Connected(val endpointId: String, val endpointName: String) : ConnectionState()
        data class Error(val message: String) : ConnectionState()
    }

    fun startAdvertising() {
        _connectionState.value = ConnectionState.Advertising
        val advertisingOptions = AdvertisingOptions.Builder().setStrategy(STRATEGY).build()
        
        connectionsClient.startAdvertising(
            deviceName,
            SERVICE_ID,
            connectionLifecycleCallback,
            advertisingOptions
        ).addOnSuccessListener {
            Log.d(TAG, "Advertising successfully started")
        }.addOnFailureListener { e ->
            Log.e(TAG, "Advertising failed", e)
            _connectionState.value = ConnectionState.Error("Advertising failed: ${e.localizedMessage}")
        }
    }

    fun stopAdvertising() {
        connectionsClient.stopAdvertising()
        if (_connectionState.value is ConnectionState.Advertising) {
            _connectionState.value = ConnectionState.Idle
        }
    }

    fun startDiscovery() {
        _connectionState.value = ConnectionState.Discovering
        _discoveredDevices.value = emptyList()
        val discoveryOptions = DiscoveryOptions.Builder().setStrategy(STRATEGY).build()

        connectionsClient.startDiscovery(
            SERVICE_ID,
            endpointDiscoveryCallback,
            discoveryOptions
        ).addOnSuccessListener {
            Log.d(TAG, "Discovery successfully started")
        }.addOnFailureListener { e ->
            Log.e(TAG, "Discovery failed", e)
            _connectionState.value = ConnectionState.Error("Discovery failed: ${e.localizedMessage}")
        }
    }

    fun stopDiscovery() {
        connectionsClient.stopDiscovery()
        if (_connectionState.value is ConnectionState.Discovering) {
            _connectionState.value = ConnectionState.Idle
        }
    }

    fun initiateConnection(endpointId: String, endpointName: String) {
        _connectionState.value = ConnectionState.Connecting(endpointId, endpointName)
        
        // Mark device status as connecting
        _discoveredDevices.value = _discoveredDevices.value.map {
            if (it.endpointId == endpointId) it.copy(status = DeviceStatus.CONNECTING) else it
        }

        connectionsClient.requestConnection(
            deviceName,
            endpointId,
            connectionLifecycleCallback
        ).addOnFailureListener { e ->
            Log.e(TAG, "Connection request failed", e)
            _connectionState.value = ConnectionState.Error("Connection failed: ${e.localizedMessage}")
            _discoveredDevices.value = _discoveredDevices.value.map {
                if (it.endpointId == endpointId) it.copy(status = DeviceStatus.DISCOVERED) else it
            }
        }
    }

    fun disconnect(endpointId: String) {
        connectionsClient.disconnectFromEndpoint(endpointId)
        _connectionState.value = ConnectionState.Idle
        scope.launch {
            chatDao.insertConnectionHistory(
                ConnectionHistoryEntity(
                    endpointId = endpointId,
                    deviceName = "Unknown",
                    connectionStatus = "Disconnected",
                    timestamp = System.currentTimeMillis()
                )
            )
        }
    }

    fun sendText(endpointId: String, text: String) {
        scope.launch {
            val messageEntity = MessageEntity(
                senderName = username,
                senderEndpointId = endpointId,
                messageText = text,
                imagePath = null,
                timestamp = System.currentTimeMillis(),
                deliveryStatus = "Sending",
                isIncoming = false
            )
            val msgId = chatDao.insertMessage(messageEntity)
            
            try {
                val payloadJson = Json.encodeToString(
                    NearbyPayload.serializer(),
                    NearbyPayload.Text(
                        messageId = msgId,
                        text = text,
                        senderName = username,
                        timestamp = messageEntity.timestamp
                    )
                )
                val payload = Payload.fromBytes(payloadJson.toByteArray(Charsets.UTF_8))
                connectionsClient.sendPayload(endpointId, payload)
                
                chatDao.updateDeliveryStatus(msgId, "Sent")
            } catch (e: Exception) {
                Log.e(TAG, "Error sending message", e)
                chatDao.updateDeliveryStatus(msgId, "Failed")
            }
        }
    }

    fun sendImage(endpointId: String, compressedFile: File) {
        scope.launch {
            val messageEntity = MessageEntity(
                senderName = username,
                senderEndpointId = endpointId,
                messageText = null,
                imagePath = compressedFile.absolutePath,
                timestamp = System.currentTimeMillis(),
                deliveryStatus = "Sending",
                isIncoming = false
            )
            val msgId = chatDao.insertMessage(messageEntity)

            try {
                // Create payload from file using ParcelFileDescriptor for reliability
                val pfd = ParcelFileDescriptor.open(compressedFile, ParcelFileDescriptor.MODE_READ_ONLY)
                val filePayload = Payload.fromFile(pfd)
                val filePayloadId = filePayload.id

                // Send metadata first
                val metadataJson = Json.encodeToString(
                    NearbyPayload.serializer(),
                    NearbyPayload.ImageMetadata(
                        messageId = msgId,
                        fileName = compressedFile.name,
                        fileSize = compressedFile.length(),
                        filePayloadId = filePayloadId,
                        senderName = username,
                        timestamp = messageEntity.timestamp
                    )
                )
                val metaPayload = Payload.fromBytes(metadataJson.toByteArray(Charsets.UTF_8))
                connectionsClient.sendPayload(endpointId, metaPayload)

                // Track transfer start time and map payloadId to messageId
                transferStartTimes[filePayloadId] = SystemClock.elapsedRealtime()
                payloadIdToMessageId[filePayloadId] = msgId

                // Send the actual file
                connectionsClient.sendPayload(endpointId, filePayload)
            } catch (e: Exception) {
                Log.e(TAG, "Error sending image", e)
                chatDao.updateDeliveryStatus(msgId, "Failed")
            }
        }
    }

    // Callbacks
    private val endpointDiscoveryCallback = object : EndpointDiscoveryCallback() {
        override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
            Log.d(TAG, "Endpoint found: $endpointId - ${info.endpointName}")
            val newDevice = NearbyDevice(endpointId, info.endpointName)
            if (!_discoveredDevices.value.any { it.endpointId == endpointId }) {
                _discoveredDevices.value = _discoveredDevices.value + newDevice
            }
        }

        override fun onEndpointLost(endpointId: String) {
            Log.d(TAG, "Endpoint lost: $endpointId")
            _discoveredDevices.value = _discoveredDevices.value.filter { it.endpointId != endpointId }
        }
    }

    private val connectionLifecycleCallback = object : ConnectionLifecycleCallback() {
        override fun onConnectionInitiated(endpointId: String, info: ConnectionInfo) {
            Log.d(TAG, "Connection initiated: $endpointId - ${info.endpointName}")
            
            // Show secure verification dialog
            _connectionRequest.value = ConnectionRequest(
                    endpointId = endpointId,
                    endpointName = info.endpointName,
                    authenticationToken = info.authenticationToken
                ) { accepted ->
                    _connectionRequest.value = null
                    if (accepted) {
                        connectionsClient.acceptConnection(endpointId, payloadCallback)
                    } else {
                        connectionsClient.rejectConnection(endpointId)
                        _connectionState.value = ConnectionState.Idle
                    }
                }
        }

        override fun onConnectionResult(endpointId: String, result: ConnectionResolution) {
            when (result.status.statusCode) {
                ConnectionsStatusCodes.STATUS_OK -> {
                    Log.d(TAG, "Connected to $endpointId")
                    val deviceName = _discoveredDevices.value.find { it.endpointId == endpointId }?.deviceName ?: "Nearby Peer"
                    _connectionState.value = ConnectionState.Connected(endpointId, deviceName)

                    _discoveredDevices.value = _discoveredDevices.value.map {
                        if (it.endpointId == endpointId) it.copy(status = DeviceStatus.CONNECTED) else it
                    }

                    scope.launch {
                        chatDao.insertConnectionHistory(
                            ConnectionHistoryEntity(
                                endpointId = endpointId,
                                deviceName = deviceName,
                                connectionStatus = "Connected",
                                timestamp = System.currentTimeMillis()
                            )
                        )
                    }
                }
                ConnectionsStatusCodes.STATUS_CONNECTION_REJECTED -> {
                    Log.d(TAG, "Connection rejected by $endpointId")
                    _connectionState.value = ConnectionState.Error("Connection rejected by partner device.")
                    _discoveredDevices.value = _discoveredDevices.value.map {
                        if (it.endpointId == endpointId) it.copy(status = DeviceStatus.REJECTED) else it
                    }
                }
                else -> {
                    Log.d(TAG, "Connection failed: ${result.status.statusMessage}")
                    _connectionState.value = ConnectionState.Error("Connection failed: ${result.status.statusMessage}")
                    _discoveredDevices.value = _discoveredDevices.value.map {
                        if (it.endpointId == endpointId) it.copy(status = DeviceStatus.DISCOVERED) else it
                    }
                }
            }
        }

        override fun onDisconnected(endpointId: String) {
            Log.d(TAG, "Disconnected from $endpointId")
            _connectionState.value = ConnectionState.Idle
            _discoveredDevices.value = _discoveredDevices.value.map {
                if (it.endpointId == endpointId) it.copy(status = DeviceStatus.DISCOVERED) else it
            }
            scope.launch {
                chatDao.insertConnectionHistory(
                    ConnectionHistoryEntity(
                        endpointId = endpointId,
                        deviceName = "Unknown",
                        connectionStatus = "Disconnected",
                        timestamp = System.currentTimeMillis()
                    )
                )
            }
        }
    }

    private val payloadCallback = object : PayloadCallback() {
        override fun onPayloadReceived(endpointId: String, payload: Payload) {
            if (payload.type == Payload.Type.BYTES) {
                val bytes = payload.asBytes() ?: return
                val jsonStr = String(bytes, Charsets.UTF_8)
                try {
                    val parsed = Json.decodeFromString(NearbyPayload.serializer(), jsonStr)
                    when (parsed) {
                        is NearbyPayload.Text -> {
                            scope.launch {
                                chatDao.insertMessage(
                                    MessageEntity(
                                        senderName = parsed.senderName,
                                        senderEndpointId = endpointId,
                                        messageText = parsed.text,
                                        imagePath = null,
                                        timestamp = parsed.timestamp,
                                        deliveryStatus = "Received",
                                        isIncoming = true
                                    )
                                )
                            }
                        }
                        is NearbyPayload.ImageMetadata -> {
                            Log.d(TAG, "Received ImageMetadata for payload: ${parsed.filePayloadId}, msgId: ${parsed.messageId}")
                            // Register file payload matching metadata
                            receivedMetadata[parsed.filePayloadId] = parsed
                            // Setup initial message record for image download progress
                            scope.launch {
                                // IMPORTANT: Ensure we don't have a partial record already
                                val localId = chatDao.insertMessage(
                                    MessageEntity(
                                        senderName = parsed.senderName,
                                        senderEndpointId = endpointId,
                                        messageText = null,
                                        imagePath = "PENDING", // Use a placeholder string to avoid being "null" if that's causing filtering
                                        timestamp = parsed.timestamp,
                                        deliveryStatus = "Receiving",
                                        transferProgress = 0,
                                        isIncoming = true
                                    )
                                )
                                // Map the incoming file payload ID to the local message ID
                                payloadIdToMessageId[parsed.filePayloadId] = localId
                                Log.d(TAG, "Mapped incoming payload ${parsed.filePayloadId} to local msgId $localId")
                            }
                            transferStartTimes[parsed.filePayloadId] = SystemClock.elapsedRealtime()
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed parsing JSON payload", e)
                }
            } else if (payload.type == Payload.Type.FILE) {
                // Incoming file payload
                Log.d(TAG, "Incoming file payload registered with ID: ${payload.id}")
                incomingFilePayloads[payload.id] = payload
            }
        }

        override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) {
            val payloadId = update.payloadId
            val startTime = transferStartTimes[payloadId] ?: SystemClock.elapsedRealtime()
            val elapsedSec = (SystemClock.elapsedRealtime() - startTime) / 1000.0
            
            val speedKbps = if (elapsedSec > 0) {
                (update.bytesTransferred / 1024.0) / elapsedSec
            } else 0.0

            val etaSeconds = if (speedKbps > 0) {
                ((update.totalBytes - update.bytesTransferred) / 1024.0 / speedKbps).toLong()
            } else 9999L

            val progressPercent = if (update.totalBytes > 0) {
                (update.bytesTransferred.toFloat() / update.totalBytes * 100).coerceIn(0f, 100f)
            } else 0f

            val msgId = payloadIdToMessageId[payloadId] ?: payloadId
            val meta = receivedMetadata[payloadId]
            val isIncoming = meta != null || incomingFilePayloads.containsKey(payloadId)

            // Update database status
            scope.launch {
                // If we have an incoming file but no metadata record yet, we can't do much but wait
                // However, we should ensure isUploading is correct in progress info
                val isActuallyUploading = !isIncoming
                if (update.status == PayloadTransferUpdate.Status.SUCCESS) {
                    Log.d(TAG, "Payload transfer success: $payloadId")
                    if (isIncoming && meta != null) {
                        // Locate the temporary file
                        val payload = incomingFilePayloads[payloadId]
                        val file = payload?.asFile()?.asJavaFile()
                        Log.d(TAG, "Incoming file SUCCESS. Payload: $payload, File exists: ${file?.exists()}")
                        if (file != null && file.exists()) {
                            // Move file to application internal directory
                            val destFolder = File(context.filesDir, "received_images")
                            if (!destFolder.exists()) destFolder.mkdirs()
                            
                            val destFile = File(destFolder, "img_${System.currentTimeMillis()}_${meta.fileName}")
                            try {
                                Log.d(TAG, "Copying file to: ${destFile.absolutePath}")
                                FileInputStream(file).use { input ->
                                    FileOutputStream(destFile).use { output ->
                                        input.copyTo(output)
                                    }
                                }
                                Log.d(TAG, "Copy success. Updating database for msgId: $msgId")
                                chatDao.updateMessage(
                                    MessageEntity(
                                        id = msgId,
                                        senderName = meta.senderName,
                                        senderEndpointId = endpointId,
                                        messageText = null,
                                        imagePath = destFile.absolutePath,
                                        timestamp = meta.timestamp,
                                        deliveryStatus = "Received",
                                        transferProgress = 100,
                                        isIncoming = true
                                    )
                                )
                                // Delete the temporary file
                                file.delete()
                            } catch (e: Exception) {
                                Log.e(TAG, "Error saving downloaded file", e)
                                chatDao.updateDeliveryStatus(msgId, "Failed")
                            }
                        } else {
                            Log.e(TAG, "File is null or doesn't exist despite SUCCESS status")
                            chatDao.updateDeliveryStatus(msgId, "Failed")
                        }
                        receivedMetadata.remove(payloadId)
                        incomingFilePayloads.remove(payloadId)
                    } else {
                        // Outgoing file success, update sending message status
                        Log.d(TAG, "Outgoing file SUCCESS. Updating status for msgId: $msgId")
                        chatDao.updateDeliveryStatus(msgId, "Sent")
                    }
                    transferStartTimes.remove(payloadId)
                    payloadIdToMessageId.remove(payloadId)
                    _transferProgress.value = _transferProgress.value - payloadId
                } else if (update.status == PayloadTransferUpdate.Status.FAILURE) {
                    Log.e(TAG, "Payload transfer FAILURE: $payloadId")
                    chatDao.updateDeliveryStatus(msgId, "Failed")
                    if (isIncoming) {
                        receivedMetadata.remove(payloadId)
                        incomingFilePayloads.remove(payloadId)
                    }
                    transferStartTimes.remove(payloadId)
                    payloadIdToMessageId.remove(payloadId)
                    _transferProgress.value = _transferProgress.value - payloadId
                } else if (update.status == PayloadTransferUpdate.Status.IN_PROGRESS) {
                    // Update progress maps
                    _transferProgress.value = _transferProgress.value + (payloadId to TransferProgressInfo(
                        messageId = msgId,
                        bytesTransferred = update.bytesTransferred,
                        totalBytes = update.totalBytes,
                        percent = progressPercent,
                        speedKbps = speedKbps,
                        etaSeconds = etaSeconds,
                        isUploading = !isIncoming
                    ))
                    // Persist periodically to DB to show in UI chat lists if msgId is valid
                    if (payloadIdToMessageId.containsKey(payloadId)) {
                        chatDao.updateTransferProgress(msgId, progressPercent.toInt())
                    }
                }
            }
        }
    }
}
