#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "MAX30100_PulseOximeter.h"
#include <DHT.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <ESPAsyncWebServer.h>

// ============ FILL THESE IN ============
uint8_t gatewayMac[] = {0x68, 0xFE, 0x71, 0xFA, 0x95, 0x08}; // <-- Gateway MAC Address
#define ESPNOW_CHANNEL 1 // <-- match the channel the gateway prints on boot
// ========================================

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

PulseOximeter pox;

#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

#define SOS_BUTTON_PIN 12 // lock-type switch: stays LOW while locked/pressed

uint32_t tsLastReport = 0;
#define REPORTING_PERIOD_MS 1000

float heartRate = 0.0;
float spo2 = 0.0;
float temperature = 0.0;
float humidity = 0.0;
char currentCondition[25] = "NORMAL";

// ---------- SHARED PACKET CONTRACT (must match gateway exactly) ----------
typedef struct {
    char nodeId;         // 'Y' = Yokes
    float metric1;       // BPM
    float metric2;       // SpO2
    float metric3;       // Temperature
    float metric4;       // Humidity
    char condition[25];
    char msgText[32];
    bool isSOS;
} VitalsPacket;

#define IMG_CHUNK_SIZE 230
typedef struct {
    char nodeId;
    uint16_t chunkIndex;
    uint16_t totalChunks;
    uint8_t len;
    uint8_t data[IMG_CHUNK_SIZE];
} ImagePacket;
// --------------------------------------------------------------------------

VitalsPacket myData;

// ---- Image upload web server (phone connects here) ----
AsyncWebServer server(80);
uint8_t* uploadBuffer = nullptr;
size_t uploadSize = 0;
const size_t MAX_IMAGE_SIZE = 36000; // ~156 chunks max

void onBeatDetected() {}

void sendImageOverEspNow(uint8_t* buf, size_t size) {
    uint16_t totalChunks = (size + IMG_CHUNK_SIZE - 1) / IMG_CHUNK_SIZE;
    Serial.printf("Sending image: %d bytes in %d chunks\n", size, totalChunks);
    
    for (uint16_t i = 0; i < totalChunks; i++) {
        ImagePacket pkt;
        pkt.nodeId = 'Y';
        pkt.chunkIndex = i;
        pkt.totalChunks = totalChunks;
        
        size_t offset = i * IMG_CHUNK_SIZE;
        size_t remaining = size - offset;
        pkt.len = remaining < IMG_CHUNK_SIZE ? remaining : IMG_CHUNK_SIZE;
        
        memcpy(pkt.data, buf + offset, pkt.len);
        
        esp_now_send(gatewayMac, (uint8_t*)&pkt, sizeof(pkt));
        
        // Increased delay to 40ms to maximize transmission delivery success rate
        // and eliminate packet drop alignments in the web decoder.
        delay(40); 
    }
    Serial.println("Image fully sent to gateway.");
}

void setup() {
    Serial.begin(115200);

    pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);
    Wire.begin(21, 22);
    dht.begin();

    uploadBuffer = (uint8_t*)malloc(MAX_IMAGE_SIZE);
    if (!uploadBuffer) {
        Serial.println("Failed to allocate upload buffer!");
        while (1) delay(1000);
    }

    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { for(;;); }
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("Booting Yokes Node...");
    display.display();

    if (!pox.begin()) {
        display.clearDisplay();
        display.setCursor(0, 0);
        display.println("MAX30100 Failed!");
        display.display();
        for(;;);
    }
    pox.setOnBeatDetectedCallback(onBeatDetected);

    // AP_STA mode: SoftAP so a phone can connect and upload photos,
    // STA so ESP-NOW can talk to the gateway -- both on the same channel.
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP("Patient-Node-Yokes-Cam", "12345678", ESPNOW_CHANNEL);
    Serial.print("Camera AP IP: ");
    Serial.println(WiFi.softAPIP());

    esp_wifi_set_promiscuous(true);
    esp_wifi_set_channel(ESPNOW_CHANNEL, WIFI_SECOND_CHAN_NONE);
    esp_wifi_set_promiscuous(false);

    if (esp_now_init() != ESP_OK) {
        Serial.println("ESP-NOW init failed");
        return;
    }
    esp_now_peer_info_t peer = {};
    memcpy(peer.peer_addr, gatewayMac, 6);
    peer.channel = ESPNOW_CHANNEL;
    peer.encrypt = false;
    esp_now_add_peer(&peer);

    memset(&myData, 0, sizeof(VitalsPacket));
    myData.nodeId = 'Y';
    strcpy(myData.msgText, "None");

    // ---- Web page: opens camera, compresses locally, uploads compressed blob ----
    server.on("/", HTTP_GET, [](AsyncWebServerRequest *req){
        req->send(200, "text/html", R"HTML(
<!DOCTYPE html>
<html><body>
<h3>Capture and send to hospital</h3>
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
    const MAX_DIM = 220;
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
    }, 'image/jpeg', 0.7);
  };
});
</script>
</body></html>
)HTML");
    });

    server.on("/upload", HTTP_POST,
        [](AsyncWebServerRequest *req){
            req->send(200, "text/plain", "Uploaded " + String(uploadSize) + " bytes, forwarding to gateway...");
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

void loop() {
    pox.update();

    if (millis() - tsLastReport > REPORTING_PERIOD_MS) {
        tsLastReport = millis();

        heartRate = pox.getHeartRate();
        spo2 = pox.getSpO2();

        float t = dht.readTemperature();
        float h = dht.readHumidity();
        if (!isnan(t) && !isnan(h)) {
            temperature = t;
            humidity = h;
        }

        bool sosPressed = (digitalRead(SOS_BUTTON_PIN) == LOW);

        if (heartRate > 130.0) {
            strcpy(currentCondition, "TACHYCARDIA!!");
        } else if (humidity > 105.0) {
            strcpy(currentCondition, "RESP DISTRESS");
        } else {
            strcpy(currentCondition, "NORMAL");
        }

        myData.metric1 = heartRate;
        myData.metric2 = spo2;
        myData.metric3 = temperature;
        myData.metric4 = humidity;
        myData.isSOS = sosPressed;
        strcpy(myData.condition, currentCondition);

        display.clearDisplay();
        display.setTextColor(SSD1306_WHITE);
        display.setTextSize(1);

        if (sosPressed) {
            display.setCursor(0, 0);
            display.print("Patient: Yokes");
            display.drawFastHLine(0, 11, 128, SSD1306_WHITE);
            display.setTextSize(2);
            display.setCursor(20, 32);
            display.println("!! SOS !!");
        } else {
            display.setCursor(0, 0);
            display.print("PATIENT: Yokes");
            display.drawFastHLine(0, 11, 128, SSD1306_WHITE);
            display.setCursor(0, 16);
            display.print("BPM  : "); display.print(heartRate, 1);
            display.setCursor(70, 16);
            display.print("SpO2: "); display.print(spo2, 1); display.print("%");
            display.setCursor(0, 32);
            display.print("Temp : "); display.print(temperature, 1); display.print("C");
            display.setCursor(70, 32);
            display.print("Hum : "); display.print(humidity, 1); display.print("%");
            display.drawFastHLine(0, 48, 128, SSD1306_WHITE);
            display.setCursor(0, 53);
            display.print("STATUS: "); display.print(currentCondition);
        }
        display.display();

        esp_now_send(gatewayMac, (uint8_t *)&myData, sizeof(VitalsPacket));
    }
}