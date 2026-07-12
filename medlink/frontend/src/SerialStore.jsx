/**
 * SerialStore.jsx
 * ─────────────────────────────────────────────────────────────────
 * Shared Zustand store that:
 *   1. Opens the Web Serial API port at 115 200 baud
 *   2. Parses gateway serial lines:
 *        VITALS,Y,<bpm>,<spo2>,<temp>,<hum>,<condition>,<sos>
 *        IMAGE_CHUNK,Y,<idx>,<total>,<len>,<hexdata>
 *   3. Publishes live vitals + assembled images to every consumer
 *      (PatientVitals, ClinicalNLP, ImageTransfer)
 */

import { create } from 'zustand';

// Map node-id character → human-readable patient name
export const NODE_NAMES = { Y: 'Yokes' };

function hexToUint8(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++)
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return arr;
}

export const useSerialStore = create((set, get) => ({
  // ── connection ──
  port: null,
  reader: null,
  isConnected: false,
  error: '',

  // ── vitals keyed by nodeId char ──
  // { Y: { name, bpm, spo2, temp, hum, condition, isSOS, lastUpdate } }
  vitals: {},

  // ── image chunk buffers ──
  // { Y: { totalChunks, received: Map<idx, Uint8Array> } }
  imageBuffers: {},

  // ── assembled images ──
  // { Y: objectURL string }
  images: {},

  // ── event log ──
  events: [{ time: new Date().toLocaleTimeString(), msg: 'MedLink Serial Bridge initialised' }],

  // ─────────────────────────────────────────
  addEvent(msg) {
    set(s => ({
      events: [{ time: new Date().toLocaleTimeString(), msg }, ...s.events].slice(0, 40)
    }));
  },

  // ─────────────────────────────────────────
  parseLine(raw) {
    const line = raw.trim();
    if (!line) return;
    const parts = line.split(',');

    if (parts[0] === 'VITALS' && parts.length >= 8) {
      const [, nodeId, bpm, spo2, temp, hum, condition, sos] = parts;
      const name = NODE_NAMES[nodeId] || `Node-${nodeId}`;
      set(s => ({
        vitals: {
          ...s.vitals,
          [nodeId]: {
            name,
            nodeId,
            bpm: parseFloat(bpm),
            spo2: parseFloat(spo2),
            temp: parseFloat(temp),
            hum: parseFloat(hum),
            condition: condition.trim(),
            isSOS: sos.trim() === '1',
            lastUpdate: Date.now(),
          }
        }
      }));

      const v = get().vitals[nodeId];
      
      // Debug: If BPM is NaN, log the raw line so we can see what the ESP32 sent
      if (isNaN(parseFloat(bpm))) {
         get().addEvent(`DEBUG RAW: ${line}`);
      }
      
      if (v?.isSOS) get().addEvent(`🚨 SOS from ${name}!`);
      else if (parseFloat(bpm) > 130) get().addEvent(`⚠️ Tachycardia on ${name} — BPM ${parseFloat(bpm).toFixed(1)}`);
      else if (parseFloat(spo2) < 90) get().addEvent(`⚠️ Low SpO₂ on ${name} — ${parseFloat(spo2).toFixed(1)}%`);
      return;
    }

    if (parts[0] === 'IMAGE_CHUNK' && parts.length >= 6) {
      const [, nodeId, idxStr, totalStr, lenStr, hexData] = parts;
      const idx = parseInt(idxStr);
      const total = parseInt(totalStr);
      const chunk = hexToUint8(hexData || '');

      set(s => {
        const bufs = { ...s.imageBuffers };
        if (!bufs[nodeId]) bufs[nodeId] = { totalChunks: total, received: new Map() };
        bufs[nodeId].received.set(idx, chunk);

        // All chunks received? Assemble automatically.
        if (bufs[nodeId].received.size >= total) {
          setTimeout(() => get().forceAssembleImage(nodeId), 10);
        }
        return { imageBuffers: bufs };
      });
      return;
    }

    // Pass through non-critical gateway boot lines quietly
    if (line.startsWith('---') || line.startsWith('Listening')) {
      get().addEvent(`ℹ️ Gateway: ${line}`);
    }
  },

  // ── manual assembly in case of packet loss ──
  forceAssembleImage(nodeId) {
    set(s => {
      const buf = s.imageBuffers[nodeId];
      if (!buf || buf.received.size === 0) return {};

      const total = buf.totalChunks;
      const ordered = [];
      for (let i = 0; i < total; i++) {
        // ESP-NOW chunks are 230 bytes. If a packet was lost, we MUST pad with exactly
        // 230 bytes of zeros to maintain JPEG byte-alignment, otherwise the browser's
        // JPEG decoder will immediately abort and truncate the rest of the image.
        ordered.push(buf.received.get(i) || new Uint8Array(230));
      }
      
      const merged = new Uint8Array(ordered.reduce((acc, b) => acc + b.length, 0));
      let offset = 0;
      ordered.forEach(b => { merged.set(b, offset); offset += b.length; });
      
      const blob = new Blob([merged], { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);

      get().addEvent(
        `📷 ${buf.received.size === total ? 'Image' : 'Partial image'} from ${NODE_NAMES[nodeId] || nodeId} — ${buf.received.size}/${total} chunks`
      );

      const bufs = { ...s.imageBuffers };
      bufs[nodeId] = { totalChunks: total, received: new Map() }; // reset

      return {
        imageBuffers: bufs,
        images: { ...s.images, [nodeId]: url }
      };
    });
  },

  // ─────────────────────────────────────────
  async connect() {
    if (!('serial' in navigator)) {
      set({ error: 'Web Serial API not supported. Use Chrome / Edge 89+.' });
      return;
    }
    try {
      const port = await navigator.serial.requestPort();
      
      // If already open (e.g., from HMR), don't try to open again
      if (!port.readable) {
        await port.open({ baudRate: 115200 });
      }

      if (port.readable.locked) {
        throw new Error("Port is locked by a previous session. Please hard-refresh the page (F5) to clear the lock.");
      }

      // Read raw bytes and decode manually to avoid TransformStream locking issues
      const reader = port.readable.getReader();
      const decoder = new TextDecoder();

      set({ port, reader, isConnected: true, error: '' });
      get().addEvent('🔌 Serial port connected at 115200 baud');

      // Read loop
      let buffer = '';
      (async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop(); // keep partial last line
              lines.forEach(l => get().parseLine(l));
            }
          }
        } catch (err) {
          get().addEvent(`Serial read error: ${err.message}`);
        } finally {
          set({ isConnected: false });
          get().addEvent('🔴 Serial port disconnected');
        }
      })();
    } catch (err) {
      set({ error: err.message });
      get().addEvent(`Connection failed: ${err.message}`);
    }
  },

  async disconnect() {
    const { reader, port } = get();
    
    if (reader) {
      try {
        await reader.cancel();
        reader.releaseLock();
      } catch (err) {
        console.warn('Reader cleanup issue:', err);
      }
    }
    
    if (port) {
      try {
        await port.close();
      } catch (err) {
        console.warn('Port close issue:', err);
      }
    }
    
    set({ port: null, reader: null, isConnected: false });
    get().addEvent('🔴 Serial port disconnected cleanly');
  },
}));
