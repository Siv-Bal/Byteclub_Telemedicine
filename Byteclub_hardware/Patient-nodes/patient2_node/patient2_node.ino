/*
 * PATIENT 2 NODE (Karthik) - ECG + MQ9 only, no MAX30100/DHT11
 * HR is derived from ECG peak-to-peak interval timing.
 * Detects: NORMAL, TACHYCARDIA, BRADYCARDIA, ARRHYTHMIA_SUSPECTED, RESP_DISTRESS
 */

#include <SPI.h>
#include <LoRa.h>
#include "model_p2.h"

#define LORA_SS   5
#define LORA_RST  14
#define LORA_DIO0 26
#define LORA_FREQ 433E6

#define ECG_PIN 34
#define MQ9_PIN 35

Eloquent::ML::Port::DecisionTree model;

uint32_t tsLastReport = 0;
#define REPORTING_PERIOD_MS 2000

// ---------- ECG peak detection for HR ----------
#define ECG_THRESHOLD 2600     // ADC threshold for R-peak; calibrate to your ECG module's baseline
uint32_t lastPeakTime = 0;
float ecgHr = 75;              // running HR estimate
bool wasAbovePeak = false;

// ---------- ECG variability (irregularity proxy) ----------
#define ECG_WINDOW 50
int ecgBuffer[ECG_WINDOW];
int ecgIdx = 0;
bool ecgBufferFull = false;

float computeEcgVariance() {
  int n = ecgBufferFull ? ECG_WINDOW : ecgIdx;
  if (n < 2) return 0;
  float mean = 0;
  for (int i = 0; i < n; i++) mean += ecgBuffer[i];
  mean /= n;
  float var = 0;
  for (int i = 0; i < n; i++) var += (ecgBuffer[i] - mean) * (ecgBuffer[i] - mean);
  var /= n;
  return var / 1000000.0; // scaled to roughly match training data range
}

void setup() {
  Serial.begin(115200);
  pinMode(ECG_PIN, INPUT);
  pinMode(MQ9_PIN, INPUT);

  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(LORA_FREQ)) {
    Serial.println("LoRa init failed");
    while (1);
  }
  Serial.println("Patient 2 node ready.");
}

void loop() {
  int ecgRaw = analogRead(ECG_PIN);

  // Rolling buffer for variability
  ecgBuffer[ecgIdx] = ecgRaw;
  ecgIdx++;
  if (ecgIdx >= ECG_WINDOW) {
    ecgIdx = 0;
    ecgBufferFull = true;
  }

  // Simple peak detection -> beat-to-beat interval -> HR
  bool isAbovePeak = ecgRaw > ECG_THRESHOLD;
  if (isAbovePeak && !wasAbovePeak) {
    uint32_t now = millis();
    uint32_t interval = now - lastPeakTime;
    if (lastPeakTime > 0 && interval > 250 && interval < 2000) { // reject noise (250ms-2000ms = 30-240bpm range)
      float instantHr = 60000.0 / interval;
      ecgHr = 0.7 * ecgHr + 0.3 * instantHr; // smooth
    }
    lastPeakTime = now;
  }
  wasAbovePeak = isAbovePeak;

  if (millis() - tsLastReport > REPORTING_PERIOD_MS) {
    tsLastReport = millis();

    float ecgVar = computeEcgVariance();
    int gasRaw = analogRead(MQ9_PIN);
    float gasPpm = map(gasRaw, 0, 4095, 0, 1000); // rough scale -- calibrate to MQ9 datasheet curve

    Serial.printf("ECG_HR=%.1f ECGvar=%.3f Gas=%.0f\n", ecgHr, ecgVar, gasPpm);

    float features[3] = {ecgHr, ecgVar, gasPpm};
    int prediction = model.predict(features);
    const char* label = model.idxToLabel(prediction);
    Serial.printf("-> %s\n", label);

    String packet = "PATIENT2,DATA," + String(label) + "," +
                     String(ecgHr, 1) + "," + String(ecgVar, 3) + "," +
                     String(gasPpm, 0);
    LoRa.beginPacket();
    LoRa.print(packet);
    LoRa.endPacket();
    Serial.println("LoRa sent -> " + packet);
  }
}

/*
 * NOTE: ECG_THRESHOLD (2600) is a guess. Watch raw ADC values via Serial
 * (temporarily print ecgRaw every loop) to find your ECG module's actual
 * resting baseline and peak amplitude, then set the threshold roughly
 * halfway between baseline and peak.
 */
