/*
 * ============================================================================
 *  GATEWAY NODE  (LoRa version)
 *  Receives vitals from Yokes + Karthik, receives + ACKs image chunks from
 *  Yokes, forwards everything over Serial in the same format the downstream
 *  dashboard/Firebase bridge already expects.
 *
 *  Radio: RA-02 / RA-01 (SX1278), library: LoRa.h (Sandeep Mistry), 433 MHz
 *
 *  IMPORTANT: The "SHARED LoRa PROTOCOL" block below MUST be identical,
 *  byte-for-byte, across Node-Yokes, Node-Karthik, and this Gateway.
 * ============================================================================
 */

#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <SPI.h>
#include <LoRa.h>

// ============================================================================
// LORA HARDWARE PIN CONFIG -- adjust to match your wiring
// ============================================================================
#define LORA_SCK   18
#define LORA_MISO  19
#define LORA_MOSI  23
#define LORA_SS    5
#define LORA_RST   14
#define LORA_DIO0  26

// ============================================================================
// SHARED LoRa PROTOCOL -- KEEP IDENTICAL ACROSS ALL 3 NODES
// ============================================================================
#define LORA_FREQUENCY      433E6
#define LORA_SYNC_WORD      0xF3     // private network sync word, must match everywhere
#define LORA_SPREADING_FACTOR 7      // SF7: faster, shorter range. Raise to 9-10 if range is poor.
#define LORA_BANDWIDTH      125E3
#define LORA_CODING_RATE    5        // 4/5
#define LORA_TX_POWER       20       // dBm

#define NODE_ID_YOKES    'Y'
#define NODE_ID_KARTHIK  'K'
#define NODE_ID_GATEWAY  'G'
#define NODE_ID_BROADCAST 0xFF

#define MSG_TYPE_VITALS     0x01
#define MSG_TYPE_IMG_CHUNK  0x02
#define MSG_TYPE_ACK        0x03

#pragma pack(push, 1)
typedef struct {
    uint8_t  destId;
    uint8_t  srcId;
    uint8_t  msgType;
    uint16_t seq;          // chunk index for images, running counter for vitals
    uint16_t totalChunks;  // only meaningful for MSG_TYPE_IMG_CHUNK, else 0
    uint8_t  payloadLen;
} LoRaHeader;

typedef struct {
    float   metric1;
    float   metric2;
    float   metric3;
    float   metric4;
    char    condition[25];
    char    msgText[32];
    uint8_t isSOS;
} VitalsPayload;
#pragma pack(pop)

#define LORA_HEADER_SIZE   sizeof(LoRaHeader)
#define IMG_CHUNK_SIZE     200        // must match the patient-node chunk size
#define LORA_RX_BUF_SIZE   (LORA_HEADER_SIZE + IMG_CHUNK_SIZE + 16) // small safety margin
#define LBT_MAX_WAIT_MS    300

// ============================================================================
// HARDWARE CONFIG
// ============================================================================
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

#define BUZZER_PIN 25  // Connect positive pin of buzzer to GPIO 25

// Asynchronous Alert Tracking Variables
unsigned long buzzerOffTime = 0;
bool buzzerActive = false;

void triggerAlertBuzzer() {
    digitalWrite(BUZZER_PIN, HIGH);
    buzzerOffTime = millis() + 2000; // Keep active for exactly 2000ms
    buzzerActive = true;
}

void updateOledDisplay(uint8_t srcId, const VitalsPayload &vitals) {
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);

    if (vitals.isSOS) {
        display.setTextSize(1);
        display.setCursor(0, 0);
        display.print("GATEWAY - NODE: "); display.print((char)srcId);
        display.drawFastHLine(0, 11, 128, SSD1306_WHITE);

        display.setTextSize(2);
        display.setCursor(20, 30);
        display.println("!! SOS !!");
    } else {
        display.setTextSize(1);
        display.setCursor(0, 0);
        display.print("GATEWAY - LIVE DATA ["); display.print((char)srcId); display.print("]");
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

// ============================================================================
// LoRa LOW-LEVEL HELPERS
// ============================================================================

void loraWaitForClearChannel() {
    uint32_t start = millis();
    while (millis() - start < LBT_MAX_WAIT_MS) {
        int size = LoRa.parsePacket();
        if (size == 0) break;
        while (LoRa.available()) LoRa.read(); // drain foreign traffic
        delay(random(5, 25));
    }
    delay(random(2, 15));
}

void loraSendRaw(uint8_t* buf, size_t len) {
    loraWaitForClearChannel();
    LoRa.beginPacket();
    LoRa.write(buf, len);
    LoRa.endPacket();
}

void sendImageChunkAck(uint8_t destId, uint16_t seq) {
    LoRaHeader hdr;
    hdr.destId = destId;
    hdr.srcId = NODE_ID_GATEWAY;
    hdr.msgType = MSG_TYPE_ACK;
    hdr.seq = seq;
    hdr.totalChunks = 0;
    hdr.payloadLen = 0;

    uint8_t buf[LORA_HEADER_SIZE];
    memcpy(buf, &hdr, LORA_HEADER_SIZE);
    loraSendRaw(buf, LORA_HEADER_SIZE);
}

// ============================================================================
// PACKET HANDLERS
// ============================================================================

void handleVitals(uint8_t srcId, const VitalsPayload &vitals) {
    // Same CSV-style line the downstream dashboard/Firebase bridge already parses
    Serial.print("VITALS,");
    Serial.print((char)srcId); Serial.print(",");
    Serial.print(vitals.metric1, 1); Serial.print(",");
    Serial.print(vitals.metric2, 1); Serial.print(",");
    Serial.print(vitals.metric3, 1); Serial.print(",");
    Serial.print(vitals.metric4, 1); Serial.print(",");
    Serial.print(vitals.condition); Serial.print(",");
    Serial.println(vitals.isSOS ? "1" : "0");

    updateOledDisplay(srcId, vitals);

    if (vitals.isSOS || strcmp(vitals.condition, "NORMAL") != 0) {
        triggerAlertBuzzer();
    }
}

void handleImageChunk(uint8_t srcId, uint16_t chunkIndex, uint16_t totalChunks,
                       uint8_t len, const uint8_t* data) {
    // Same hex-streamed format the downstream image reconstructor already expects
    Serial.print("IMAGE_CHUNK,");
    Serial.print((char)srcId); Serial.print(",");
    Serial.print(chunkIndex); Serial.print(",");
    Serial.print(totalChunks); Serial.print(",");
    Serial.print(len); Serial.print(",");

    for (int i = 0; i < len; i++) {
        if (data[i] < 0x10) Serial.print("0");
        Serial.print(data[i], HEX);
    }
    Serial.println();

    // ACK immediately so the sender's stop-and-wait loop can move to the next chunk
    sendImageChunkAck(srcId, chunkIndex);
}

// ============================================================================
// SETUP
// ============================================================================
void setup() {
    Serial.begin(115200);
    while (!Serial) delay(10);

    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);

    Wire.begin(21, 22);
    randomSeed(esp_random());

    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        Serial.println("SSD1306 allocation failed");
        // Don't freeze setup; keep forwarding data even if the screen fails
    } else {
        display.clearDisplay();
        display.setTextSize(1);
        display.setTextColor(SSD1306_WHITE);
        display.setCursor(0, 0);
        display.println("Booting Gateway...");
        display.println("Awaiting Node Linked.");
        display.display();
    }

    Serial.println("--- Gateway Node Initializing ---");

    // ---- LoRa init ----
    SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
    LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
    if (!LoRa.begin(LORA_FREQUENCY)) {
        Serial.println("LoRa init failed. Check wiring.");
        if (display.width() > 0) {
            display.clearDisplay();
            display.setCursor(0, 0);
            display.println("LoRa init failed!");
            display.display();
        }
        while (1) delay(1000);
    }
    LoRa.setSyncWord(LORA_SYNC_WORD);
    LoRa.setSpreadingFactor(LORA_SPREADING_FACTOR);
    LoRa.setSignalBandwidth(LORA_BANDWIDTH);
    LoRa.setCodingRate4(LORA_CODING_RATE);
    LoRa.setTxPower(LORA_TX_POWER);
    Serial.println("LoRa radio initialized. Listening for nodes...");
}

// ============================================================================
// LOOP
// ============================================================================
void loop() {
    // Non-blocking buzzer timeout so image payloads stream without lag
    if (buzzerActive && millis() >= buzzerOffTime) {
        digitalWrite(BUZZER_PIN, LOW);
        buzzerActive = false;
    }

    int packetSize = LoRa.parsePacket();
    if (packetSize <= 0) return;

    uint8_t rxBuf[LORA_RX_BUF_SIZE];
    int received = 0;
    while (LoRa.available() && received < (int)sizeof(rxBuf)) {
        rxBuf[received++] = LoRa.read();
    }

    if (received < (int)LORA_HEADER_SIZE) {
        return; // malformed / truncated packet, drop it
    }

    LoRaHeader hdr;
    memcpy(&hdr, rxBuf, LORA_HEADER_SIZE);

    if (hdr.destId != NODE_ID_GATEWAY) {
        return; // not addressed to us, ignore
    }

    const uint8_t* payload = rxBuf + LORA_HEADER_SIZE;
    int payloadBytesReceived = received - LORA_HEADER_SIZE;

    if (hdr.msgType == MSG_TYPE_VITALS && payloadBytesReceived >= (int)sizeof(VitalsPayload)) {
        VitalsPayload vitals;
        memcpy(&vitals, payload, sizeof(VitalsPayload));
        handleVitals(hdr.srcId, vitals);
    }
    else if (hdr.msgType == MSG_TYPE_IMG_CHUNK && payloadBytesReceived >= hdr.payloadLen) {
        handleImageChunk(hdr.srcId, hdr.seq, hdr.totalChunks, hdr.payloadLen, payload);
    }
}
