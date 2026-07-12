# MedLink — Remote Telemedicine & Clinical Intelligence Gateway

> **Offline-first. Edge-native. Built for the field.**

MedLink is a complete telemedicine platform designed for remote field operations, disaster response, and low-connectivity environments. It operates over a local ad-hoc **ESP-NOW wireless mesh network** between ESP32 nodes — no internet, no router, no cloud dependency. A real-time clinical intelligence dashboard aggregates live patient vitals, NLP-driven triage, progressive medical imaging, and quantum-inspired routing into a single command interface for field medics and remote doctors.

---

## ⚠️ Hardware & Real-Time Data Disclaimer

> **IMPORTANT — Please read before using this system.**

MedLink is designed to interface with **physical ESP32 hardware** for real-time patient data. The following conditions apply:

- **Real-time vitals (Heart Rate, SpO₂, Temperature, Humidity) require a connected ESP32 node** fitted with a MAX30102 pulse oximeter, DHT11 temperature/humidity sensor, and running the companion firmware over ESP-NOW.
- **The Heart Rate graph and SpO₂ readings will show `NaN` or `0.0`** if no finger is detected on the MAX30102 sensor, if the sensor is still initializing, or if the ESP32 is not connected via USB serial.
- **Image Transfer requires a second ESP32 node** equipped with an OV2640 camera module. Images are transmitted as chunked ESP-NOW packets and may be partially received in high-interference environments — the "Force Show Partial" feature handles this gracefully.
- **This system is NOT a certified medical device.** It is a research and demonstration prototype. Vitals and triage outputs must NOT be used as a sole basis for clinical decisions. Always validate readings with certified medical equipment.
- **Web Serial API is required** to connect hardware. This is only available in Chromium-based browsers (Google Chrome, Microsoft Edge, Opera). Firefox and Safari are NOT supported for hardware connectivity.
- **The dashboard operates fully offline** once the dev server is running. Voice transcription via the browser's built-in Speech API may require an internet connection unless offline language packs are installed on your OS.

---

## 🚀 Key Features

### 📊 Live Vital Monitoring
Continuously streams Heart Rate (BPM), SpO₂ (%), Core Body Temperature (°C), and Humidity (%) from ESP32 edge nodes. Includes a real-time scrolling ECG-style heart rate graph, SpO₂ radial gauge, and temperature area chart — all updating live with every packet received from the mesh.

### 🧠 Clinical Intelligence (NLP Triage Pipeline)
Local, browser-based NLP engine that processes spoken or typed clinical observations. It extracts medical entities (e.g., "unconscious", "chest pain", "labored breathing"), maps them to a compressed token protocol (**C.T.P. — Clinical Token Protocol**), calculates a severity score (0–20), and assigns a triage colour (RED / YELLOW / GREEN). All results are forwarded to the Patient Triage queue and Doctor Dashboard in real time.

### 🖼️ Progressive Medical Image Reconstruction
Reliable low-bandwidth image transfer from the OV2640 camera over ESP-NOW using chunked binary packets. Handles radio packet loss gracefully — if chunks are dropped, a **"Force Show Partial"** button lets the operator assemble and view whatever was received, with missing regions rendered as grey bands. Full images appear automatically once all chunks arrive.

### 🔬 Quantum-Inspired Routing (QUBO / QAOA Demo)
Simulates mesh relay path selection across a dynamic node topology. Uses a manual QAOA solver to minimize expected packet loss across available relay edges — demonstrating how quantum-optimization algorithms could be applied to real-time field mesh routing decisions.

### 🏥 Doctor Command Dashboard
A live-updating command centre for medical professionals. Aggregates:
- Triage urgency queue (sourced directly from Clinical NLP output)
- Real-time node vitals and ESP-NOW connection status
- Reconstructed medical images from field nodes (displayed per patient request)
- Action buttons: Dispatch, Assign, Acknowledge, View Details

---

## 📱 Mobile Field Worker App (Android — Google Nearby Connections)

The MedLink ecosystem includes a companion **Android mobile application** for field health workers operating in environments with zero cellular or Wi-Fi coverage.

### How It Works
Field workers carry Android smartphones that form a **peer-to-peer relay mesh** using **Google Nearby Connections API** (Bluetooth + BLE + Wi-Fi Direct). Patient data captured at the ESP32 node level is relayed hop-by-hop through the smartphone mesh until it reaches a device within USB-serial range of the gateway PC running the MedLink dashboard.

### Key Mobile Features
- **Automatic peer discovery:** Field devices scan for and connect to nearby MedLink nodes without any manual pairing — the Nearby Connections API handles advertisement and discovery transparently.
- **Mesh relay routing:** If a direct connection to the gateway is unavailable, data is relayed through intermediate field-worker phones. Each hop uses the QUBO/QAOA-inspired path selection algorithm to choose the relay link with the lowest observed packet-loss rate.
- **SOS Broadcast:** A hardware SOS button on the ESP32 node triggers an emergency broadcast that is propagated across the entire mesh with elevated priority, alerting all connected devices and the doctor dashboard simultaneously.
- **Offline-first sync:** The mobile app caches all patient records and vital readings locally. Data is synced to the gateway as soon as a connection window opens — no data is lost if the relay path is temporarily broken.
- **Image relay:** Chunked OV2640 camera images are forwarded through the smartphone mesh using the same progressive reconstruction protocol as the ESP-NOW layer, ensuring medical images reach the gateway even over multiple hops.

### Mobile Tech Stack
- **Platform:** Android (Java/Kotlin)
- **Connectivity:** Google Nearby Connections API (P2P — no internet required)
- **Local Storage:** Room Database (SQLite)
- **Compression:** Minified CTP token protocol for efficient relay over constrained links

---

## 🛠️ System Architecture

```
 ┌─────────────────────────────────────────────────────────────┐
 │                    MedLink Gateway PC                       │
 │  ┌──────────────────────────────────────────────────────┐  │
 │  │         React Dashboard  (Vite + Zustand)            │  │
 │  │  Dashboard │ Vitals │ NLP │ Triage │ Image │ Doctor  │  │
 │  └───────────────────┬──────────────────────────────────┘  │
 │                      │  Web Serial API (USB)               │
 │  ┌───────────────────▼──────────────────────────────────┐  │
 │  │              ESP32 Gateway Node                       │  │
 │  └───────────────────┬──────────────────────────────────┘  │
 └──────────────────────┼──────────────────────────────────────┘
                        │  ESP-NOW (2.4GHz, peer-to-peer)
         ┌──────────────┼───────────────┐
         │              │               │
  ┌──────▼──────┐ ┌─────▼──────┐  ┌────▼───────┐
  │ ESP32 Node  │ │  Android   │  │ ESP32 Node │
  │  (Yokes)   │ │ Field Phone │  │  (Camera) │
  │ MAX30102   │ │  Nearby    │  │  OV2640   │
  │ DHT11      │ │ Connections│  │  Chunked  │
  └────────────┘ └────────────┘  └───────────┘
```

---

## 💻 Getting Started (Local Development)

### Prerequisites
- Node.js ≥ 18
- Google Chrome or Microsoft Edge (for Web Serial API support)
- ESP32 hardware (optional — dashboard works in simulation mode without it)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/Siv-Bal/Byteclub_Telemedicine.git
cd Byteclub_Telemedicine

# 2. Install frontend dependencies
cd medlink/frontend
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in Chrome or Edge.

### Connecting the Hardware (Optional)

1. Flash the **Gateway firmware** to your primary ESP32 and connect it to your PC via USB.
2. Flash the **Sensor node firmware** (`Yokes`) to a second ESP32 with MAX30102 and DHT11 attached.
3. Flash the **Camera node firmware** to a third ESP32 with OV2640 attached.
4. Navigate to **Patient Vitals** in the dashboard → click **Connect Serial Port** → select the ESP32 COM port.
5. Place your finger firmly on the MAX30102 sensor — vitals will begin streaming within ~5 seconds.
6. To transfer an image, navigate to **Image Transfer** and trigger a capture from the camera node.

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend UI | React 18, Vite, Tailwind CSS |
| State Management | Zustand, React Context |
| Charts | Recharts |
| Icons | Lucide React |
| Hardware Bridge | Web Serial API |
| Edge Protocol | ESP-NOW (Espressif) |
| Sensors | MAX30102, DHT11, OV2640 |
| Mobile App | Android, Google Nearby Connections API |
| Routing Algorithm | QUBO / Manual QAOA Solver |
| NLP Engine | Browser-native JS (offline) + optional Whisper STT |

---

## 📄 License

This project was developed as part of the **ByteClub Hackathon** submission. All source code is provided for educational and demonstration purposes.
