#include <WiFi.h>
#include <esp_now.h>
#include <ESPAsyncWebServer.h>

#define CHUNK_SIZE 240
uint8_t receiverMac[] = {0x68, 0xFE, 0x71, 0xFA, 0x95, 0x08}; // Receiver MAC

AsyncWebServer server(80);
uint8_t* uploadBuffer = nullptr;
size_t uploadSize = 0;
const size_t MAX_IMAGE_SIZE = 36000; // must match receiver's MAX_CHUNKS * CHUNK_SIZE

struct Packet {
  uint16_t chunkIndex;
  uint16_t totalChunks;
  uint8_t  len;
  uint8_t  data[CHUNK_SIZE];
};

void sendImageOverEspNow(uint8_t* buf, size_t size) {
  uint16_t totalChunks = (size + CHUNK_SIZE - 1) / CHUNK_SIZE;
  Serial.printf("Sending %d bytes in %d chunks\n", size, totalChunks);
  for (uint16_t i = 0; i < totalChunks; i++) {
    Packet pkt;
    pkt.chunkIndex = i;
    pkt.totalChunks = totalChunks;
    size_t offset = i * CHUNK_SIZE;
    size_t remaining = size - offset;
    pkt.len = remaining < CHUNK_SIZE ? remaining : CHUNK_SIZE;
    memcpy(pkt.data, buf + offset, pkt.len);
    esp_now_send(receiverMac, (uint8_t*)&pkt, sizeof(pkt));
    delay(15);
  }
  Serial.println("All chunks sent.");
}

void setup() {
  Serial.begin(115200);
  delay(500);

  uploadBuffer = (uint8_t*)malloc(MAX_IMAGE_SIZE);
  if (!uploadBuffer) {
    Serial.println("Failed to allocate upload buffer!");
    while (1) delay(1000);
  }

  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP("SenderNode", "12345678");
  Serial.print("Sender AP IP: ");
  Serial.println(WiFi.softAPIP());

  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed");
    return;
  }
  esp_now_peer_info_t peerInfo = {};
  memcpy(peerInfo.peer_addr, receiverMac, 6);
  peerInfo.channel = 0;
  peerInfo.encrypt = false;
  esp_now_add_peer(&peerInfo);

  server.on("/", HTTP_GET, [](AsyncWebServerRequest *req){
    req->send(200, "text/html", R"HTML(
<!DOCTYPE html>
<html><body>
<h3>Capture and send</h3>
<input type="file" id="fileInput" accept="image/*" capture="environment">
<div id="status">Waiting for photo...</div>
<script>
document.getElementById('fileInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('status').innerText = 'Compressing...';

  const img = new Image();
  const reader = new FileReader();
  reader.onload = function(ev) { img.src = ev.target.result; };
  reader.readAsDataURL(file);

  img.onload = function() {
    const MAX_DIM = 240;
    let w = img.width, h = img.height;
    if (w > h) { h = Math.round(h * (MAX_DIM / w)); w = MAX_DIM; }
    else       { w = Math.round(w * (MAX_DIM / h)); h = MAX_DIM; }

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);

    canvas.toBlob(function(blob) {
      document.getElementById('status').innerText =
        'Sending ' + Math.round(blob.size/1024) + ' KB...';
      const formData = new FormData();
      formData.append('image', blob, 'capture.jpg');
      fetch('/upload', { method: 'POST', body: formData })
        .then(r => r.text())
        .then(t => document.getElementById('status').innerText = t)
        .catch(err => document.getElementById('status').innerText = 'Error: ' + err);
    }, 'image/jpeg', 0.75);
  };
});
</script>
</body></html>
)HTML");
  });

  server.on("/upload", HTTP_POST,
    [](AsyncWebServerRequest *req){
      req->send(200, "text/plain", "Uploaded " + String(uploadSize) + " bytes, forwarding...");
      if (uploadSize > 0) sendImageOverEspNow(uploadBuffer, uploadSize);
    },
    [](AsyncWebServerRequest *req, String filename, size_t index,
       uint8_t *data, size_t len, bool final) {
      if (index == 0) uploadSize = 0;
      if (uploadSize + len <= MAX_IMAGE_SIZE) {
        memcpy(uploadBuffer + uploadSize, data, len);
        uploadSize += len;
      } else {
        Serial.println("Warning: upload exceeds buffer, truncating.");
      }
    });

  server.begin();
}

void loop() {}