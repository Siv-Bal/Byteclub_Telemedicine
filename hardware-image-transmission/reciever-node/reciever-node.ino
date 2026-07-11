#include <WiFi.h>
#include <esp_now.h>
#include <SPIFFS.h>
#include <ESPAsyncWebServer.h>

#define CHUNK_SIZE 240
#define MAX_CHUNKS 150   // supports up to ~36KB image

struct Packet {
  uint16_t chunkIndex;
  uint16_t totalChunks;
  uint8_t  len;
  uint8_t  data[CHUNK_SIZE];
};

uint8_t* imageBuffer;
bool chunkReceived[MAX_CHUNKS] = {false};
uint16_t expectedTotal = 0;
uint16_t receivedCount = 0;
size_t finalImageSize = 0;
unsigned long lastChunkTime = 0;
bool imageReady = false;

AsyncWebServer server(80);

void onDataRecv(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
  Packet pkt;
  memcpy(&pkt, data, len);

  if (pkt.totalChunks > MAX_CHUNKS) {
    Serial.println("Image too large for buffer, dropping.");
    return;
  }

  if (expectedTotal == 0) {
    expectedTotal = pkt.totalChunks;
    receivedCount = 0;
    memset(chunkReceived, 0, sizeof(chunkReceived));
    imageReady = false;
  }

  if (!chunkReceived[pkt.chunkIndex]) {
    memcpy(imageBuffer + (pkt.chunkIndex * CHUNK_SIZE), pkt.data, pkt.len);
    chunkReceived[pkt.chunkIndex] = true;
    receivedCount++;
    if (pkt.chunkIndex == pkt.totalChunks - 1) {
      finalImageSize = (size_t)(pkt.totalChunks - 1) * CHUNK_SIZE + pkt.len;
    }
  }
  lastChunkTime = millis();

  Serial.printf("Chunk %d/%d received (have %d so far)\n",
                pkt.chunkIndex + 1, pkt.totalChunks, receivedCount);

  if (receivedCount == expectedTotal) {
    File f = SPIFFS.open("/received.jpg", FILE_WRITE);
    f.write(imageBuffer, finalImageSize);
    f.close();
    imageReady = true;
    Serial.printf("=== IMAGE COMPLETE: %d bytes saved to /received.jpg ===\n", finalImageSize);
    expectedTotal = 0;
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  imageBuffer = (uint8_t*)malloc(MAX_CHUNKS * CHUNK_SIZE);
  if (!imageBuffer) {
    Serial.println("Failed to allocate image buffer!");
    while (1) delay(1000);
  }

  if (!SPIFFS.begin(true)) Serial.println("SPIFFS mount failed");

  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP("ReceiverNode", "12345678");
  Serial.print("Receiver AP IP: ");
  Serial.println(WiFi.softAPIP());

  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed");
    return;
  }
  esp_now_register_recv_cb(onDataRecv);

  server.on("/image", HTTP_GET, [](AsyncWebServerRequest *req){
    if (imageReady) req->send(SPIFFS, "/received.jpg", "image/jpeg");
    else req->send(404, "text/plain", "No image received yet");
  });
  server.on("/status", HTTP_GET, [](AsyncWebServerRequest *req){
    String s = imageReady ? "Image ready: " + String(finalImageSize) + " bytes"
                           : "Waiting (" + String(receivedCount) + "/" + String(expectedTotal) + ")";
    req->send(200, "text/plain", s);
  });
  server.begin();

  Serial.println("Receiver ready. Visit /status and /image once transfer completes.");
}

void loop() {
  if (expectedTotal > 0 && receivedCount < expectedTotal && millis() - lastChunkTime > 5000) {
    Serial.printf("Stalled: %d/%d chunks — packet loss detected\n", receivedCount, expectedTotal);
    lastChunkTime = millis();
  }
}