# MedLink - Remote Telemedicine & Clinical Intelligence Gateway

MedLink is an offline-first, edge-capable telemedicine dashboard and gateway designed for remote field operations and disaster response. It operates over a local ad-hoc ESP-NOW wireless mesh network and provides real-time clinical telemetry, progressive image reconstruction, and NLP-driven patient triage—completely independent of the internet.

## 🚀 Key Features

- **Networked Vital Streaming (ESP-NOW):** Captures real-time vitals (Heart Rate, SpO₂, Temperature, Humidity) from ESP32 edge nodes and displays live continuous monitoring feeds.
- **Clinical Intelligence (NLP Triage Pipeline):** Local speech-to-text and clinical token processing (CTP) engine that automatically analyzes patient observations, extracts clinical entities, calculates severity scores, and triages patients based on urgency.
- **Progressive Image Reconstruction:** Reliable low-bandwidth image transfer over ESP-NOW using chunked protocols, with the ability to "Force Assemble" partial images in high-loss radio environments.
- **Quantum-Inspired Routing Demo:** Simulates mesh relay path selection (QUBO/QAOA) to minimize packet loss across dynamic mesh network topologies.
- **Doctor Command Dashboard:** A centralized, live-updating queue for medical professionals to view triage urgency, real-time node telemetry, and reconstructed field images in one place.

## 🛠️ Architecture & Tech Stack

- **Frontend Interface:** React, Tailwind CSS, Zustand, Recharts, Lucide Icons, Vite.
- **Gateway Bridge:** Web Serial API (reads live sensor streams directly from the gateway ESP32 via USB).
- **Edge Nodes:** C/C++ on ESP32 microcontrollers, utilizing ESP-NOW for peer-to-peer data and image transmission.
- **Sensors:** MAX30102 (HR/SpO2), DHT11 (Temp/Humidity) and OV2640 (Camera).

## 💻 Getting Started (Local Development)

1. Clone this repository.
2. Navigate into the frontend directory: 
   ```bash
   cd medlink/frontend
   ```
3. Install dependencies: 
   ```bash
   npm install
   ```
4. Run the development server: 
   ```bash
   npm run dev
   ```

### 📡 Connecting the Hardware

1. Flash your primary ESP32 with the Gateway code and connect it to your PC via USB.
2. Flash your secondary ESP32s (like the `Yokes` node) with the sensor and camera code.
3. Open the MedLink dashboard in a Web Serial supported browser (Chrome, Edge, or Opera).
4. Navigate to the **Patient Vitals** or **Image Transfer** tab, click **Connect Serial Port**, and select the ESP32 COM port to begin streaming live telemetry.
