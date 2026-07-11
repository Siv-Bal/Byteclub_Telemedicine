#include <esp_now.h>
#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define ESPNOW_CHANNEL 1

// ---------- OLED DISPLAY CONFIGURATION ----------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
// ------------------------------------------------

// ---------- SHARED PACKET CONTRACT (Must match patient node exactly) ----------
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

// Function to handle rendering live telemetry on the local OLED
void updateOledDisplay(const VitalsPacket &vitals) {
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    
    if (vitals.isSOS) {
        display.setTextSize(1);
        display.setCursor(0, 0);
        display.print("GATEWAY - NODE: "); display.print(vitals.nodeId);
        display.drawFastHLine(0, 11, 128, SSD1306_WHITE);
        
        display.setTextSize(2);
        display.setCursor(20, 30);
        display.println("!! SOS !!");
    } else {
        display.setTextSize(1);
        display.setCursor(0, 0);
        display.print("GATEWAY - LIVE DATA ["); display.print(vitals.nodeId); display.print("]");
        display.drawFastHLine(0, 11, 128, SSD1306_WHITE);
        
        display.setCursor(0, 18);
        display.print("BPM  : "); display.print(vitals.metric1, 1);
        display.setCursor(70, 18);
        display.print("SpO2: "); display.print(vitals.metric2, 1); display.print("%");
        
        display.setCursor(0, 34);
        display.print("Temp : "); display.print(vitals.metric3, 1); display.print("C");
        display.setCursor(70, 34);
        display.print("Hum : "); display.print(vitals.metric4, 1); display.print("%");
        
        display.drawFastHLine(0, 48, 128, SSD1306_WHITE);
        display.setCursor(0, 53);
        display.print("STATUS: "); display.print(vitals.condition);
    }
    display.display();
}

// ESP-NOW Receive Callback
void onDataRecv(const esp_now_recv_info_t *recvInfo, const uint8_t *incomingData, int len) {
    // 1. Identify packet type based on length
    if (len == sizeof(VitalsPacket)) {
        VitalsPacket vitals;
        memcpy(&vitals, incomingData, sizeof(VitalsPacket));

        // Format live vitals into a structured, easily splitable CSV-style string for the serial cable
        Serial.print("VITALS,");
        Serial.print(vitals.nodeId); Serial.print(",");
        Serial.print(vitals.metric1, 1); Serial.print(","); // BPM
        Serial.print(vitals.metric2, 1); Serial.print(","); // SpO2
        Serial.print(vitals.metric3, 1); Serial.print(","); // Temp
        Serial.print(vitals.metric4, 1); Serial.print(","); // Hum
        Serial.print(vitals.condition); Serial.print(",");
        Serial.println(vitals.isSOS ? "1" : "0");

        // Dynamically update local display hardware
        updateOledDisplay(vitals);
    } 
    else if (len == sizeof(ImagePacket)) {
        ImagePacket imgChunk;
        memcpy(&imgChunk, incomingData, sizeof(ImagePacket));

        // Print header containing metadata so the website knows how to reconstruct the image
        Serial.print("IMAGE_CHUNK,");
        Serial.print(imgChunk.nodeId); Serial.print(",");
        Serial.print(imgChunk.chunkIndex); Serial.print(",");
        Serial.print(imgChunk.totalChunks); Serial.print(",");
        Serial.print(imgChunk.len); Serial.print(",");

        // Output raw binary data payload as Hexadecimal values to safely stream across serial 
        for (int i = 0; i < imgChunk.len; i++) {
            if (imgChunk.data[i] < 0x10) Serial.print("0"); // Leading zero padding
            Serial.print(imgChunk.data[i], HEX);
        }
        Serial.println(); // Marks the end of this chunk line
    }
}

void setup() {
    // Open a high-speed serial pipeline to prevent data line choking during image bursts
    Serial.begin(115200);
    while (!Serial) delay(10);

    // Initialize I2C communications pins for display (default pins 21/SDA and 22/SCL)
    Wire.begin(21, 22);

    // Initialize SSD1306 display
    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        Serial.println("SSD1306 allocation failed");
        // Don't freeze setup entirely, let data forwarding continue even if screen hardware fails
    } else {
        display.clearDisplay();
        display.setTextSize(1);
        display.setTextColor(SSD1306_WHITE);
        display.setCursor(0, 0);
        display.println("Booting Gateway...");
        display.println("Awaiting Node Linked.");
        display.display();
    }

    // Set Wi-Fi to station mode and explicitly enforce channel matching
    WiFi.mode(WIFI_STA);
    
    // ESP-NOW requires the interface to be active on the target channel
    // We accomplish this cleanly by disconnecting from any Wi-Fi networks.
    WiFi.disconnect();

    Serial.println("--- Gateway Node Initializing ---");
    Serial.printf("Listening on ESP-NOW Channel: %d\n", ESPNOW_CHANNEL);

    if (esp_now_init() != ESP_OK) {
        Serial.println("Error initializing ESP-NOW");
        return;
    }

    // Register callback logic to automatically process incoming radio waves
    esp_now_register_recv_cb(onDataRecv);
}

void loop() {
    // Loop left clean and empty. 
    // All handling happens asynchronously inside the onDataRecv callback interrupt.
}