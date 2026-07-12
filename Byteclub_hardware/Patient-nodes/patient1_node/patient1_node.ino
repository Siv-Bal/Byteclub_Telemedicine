/*
 * PATIENT 1 NODE (Yokes) - MAX30100 + DHT11 only
 * Detects: NORMAL, HYPOXIA, TACHYCARDIA, BRADYCARDIA, FEVER, HEAT_STRESS
 */

#include <Wire.h>
#include <SPI.h>
#include <LoRa.h>
#include "MAX30100_PulseOximeter.h"
#include <DHT.h>
#include "model_p1.h"

#define LORA_SS   5
#define LORA_RST  14
#define LORA_DIO0 26
#define LORA_FREQ 433E6   // must match all other nodes and the gateway

PulseOximeter pox;
#define DHTPIN 15
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

Eloquent::ML::Port::DecisionTree model;

uint32_t tsLastReport = 0;
#define REPORTING_PERIOD_MS 2000

void onBeatDetected() {}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);

  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(LORA_FREQ)) {
    Serial.println("LoRa init failed");
    while (1);
  }

  Serial.print("Initializing MAX30100...");
  if (!pox.begin()) {
    Serial.println("FAILED");
  } else {
    Serial.println("SUCCESS");
  }
  pox.setOnBeatDetectedCallback(onBeatDetected);

  dht.begin();
  Serial.println("Patient 1 node ready.");
}

void loop() {
  pox.update();

  if (millis() - tsLastReport > REPORTING_PERIOD_MS) {
    tsLastReport = millis();

    float hr = pox.getHeartRate();
    float spo2 = pox.getSpO2();
    float temp = dht.readTemperature();
    float humidity = dht.readHumidity();
    if (isnan(temp)) temp = 36.8;
    if (isnan(humidity)) humidity = 45.0;

    Serial.printf("HR=%.1f SpO2=%.1f Temp=%.1f Hum=%.1f\n", hr, spo2, temp, humidity);

    if (hr < 30) {
      Serial.println("MAX30100 not stable yet, skipping inference");
      return;
    }

    float features[4] = {hr, spo2, temp, humidity};
    int prediction = model.predict(features);
    const char* label = model.idxToLabel(prediction);
    Serial.printf("-> %s\n", label);

    String packet = "PATIENT1,DATA," + String(label) + "," +
                     String(hr, 1) + "," + String(spo2, 1) + "," +
                     String(temp, 1) + "," + String(humidity, 1);
    LoRa.beginPacket();
    LoRa.print(packet);
    LoRa.endPacket();
    Serial.println("LoRa sent -> " + packet);
  }
}
