# MedLink — Low-Bandwidth Clinical Intelligence Gateway
### Unified Architecture + Build Spec (for Antigravity prototype generation)

This document merges every component developed across design sessions into one
implementation-ready spec: the fountain-coded progressive image transfer
technique, the two quantum (Qiskit/QAOA) decision modules, the offline
Clinical NLP + Clinical Tokenization Protocol (CTP), severity scoring and
RED/YELLOW/GREEN triage, the Nearby Connections mesh layer, and a functional
doctor dashboard spec with real button behaviors — not placeholders.

Everything here is meant to be paste-able into an AI coding agent to scaffold
a working prototype.

---

## 1. Problem & Constraints

- Bandwidth: **< 64 kbps**
- Packet loss: **> 20%**
- No centralized/cloud ML pipelines — all processing must be deterministic,
  rule-based, or classical/quantum-optimization, running on-device or on a
  local gateway/hospital server.
- Client must be a lightweight binary runnable on low-power hardware (phone /
  SBC), not a heavy ML runtime.

---

## 2. High-Level Architecture

```
Patient
  │
  ▼
ESP32 (vitals ONLY: SpO2, HR, temp, optional BP/ECG) ──BLE──▶ Field Worker Phone
                                                                    │
                                          ┌─────────────────────────────────────┐
                                          │   FIELD WORKER PHONE APP             │
                                          │                                       │
                                          │  1. Voice/text observation capture   │
                                          │  2. Offline Clinical NLP Engine      │
                                          │  3. Clinical Tokenization (CTP)      │
                                          │  4. Severity Scoring + Triage        │
                                          │  5. Progressive Wavelet Image Coding │
                                          │  6. Fountain (LT) Encoding           │
                                          └─────────────────────────────────────┘
                                                                    │
                                          Google Nearby Connections mesh
                                       (store-and-forward to best-signal phone)
                                                                    │
                                          Adaptive Relay Gateway
                                (priority-ordered fountain transport +
                                 quantum mesh-routing decision layer)
                                                                    │
                                             Hospital Server
                          - Fountain decode (peeling algorithm)
                          - CTP decode → structured patient record
                          - Progressive image reconstruction
                          - Quantum Module A: severity-weighted bandwidth triage (QAOA)
                          - Quantum Module B: mesh route selection (QAOA)
                                                                    │
                                            Doctor Dashboard
                          (functional buttons: dispatch, escalate, acknowledge,
                           request full image, view history)
```

---

## 3. End-to-End Workflow (10 steps, with implementation notes)

| Step | Action | Implementation |
|---|---|---|
| 1 | Field worker reaches patient | — |
| 2 | ESP32 collects vitals (HR, SpO2, temp, optional BP/ECG) | BLE stream to phone, raw samples only, no onboard processing |
| 3 | Worker records observation (voice or text) | Phone mic → on-device speech-to-text (or typed text directly) |
| 4 | Offline Clinical NLP extracts entities | Rule-based keyword/pattern extraction — see Section 5 |
| 5 | Entities converted to CTP tokens | Section 6 — compact codes like `C05`, `S12`, `R08` |
| 6 | Severity scoring | Explainable rule engine — Section 7 |
| 7 | Automated triage: RED / YELLOW / GREEN | Threshold on total score |
| 8 | Data transmitted | CTP record + optional image, both fountain-coded, RED priority-scheduled first — Section 8–10 |
| 9 | Doctor dashboard receives structured record | Section 11 |
| 10 | Continuous monitoring | Repeat cycle; re-scored each update, re-triaged if worsening |

---

## 4. Field Layer — ESP32 (Sensors Only)

- Reads pulse-ox (MAX30100) and ECG (AD8232), optional BP module.
- Streams raw values over BLE to the paired phone at a fixed sample rate.
- No compute, no mesh participation, no storage beyond a small ring buffer.
  Kept deliberately minimal and cheap — this is the only hardware component.

---

## 5. Offline Clinical NLP Engine (rule-based — no cloud, no trained model)

Deterministic phrase matching against a clinical phrase dictionary. This
satisfies the "no centralized ML" constraint while still converting free text
into structured entities.

```python
CTP_TOKENS = {
    "unconscious":            "C05",
    "severe chest pain":      "S12",
    "chest pain":             "S10",
    "breathing difficulty":   "R08",
    "respiratory distress":   "R08",
    "severe bleeding":        "S20",
    "fracture":                "S30",
    "high fever":              "S40",
    "seizure":                 "C10",
}

def extract_clinical_entities(note: str):
    """Longest phrases matched first and consumed, so 'severe chest pain'
    doesn't also double-count the shorter 'chest pain' phrase."""
    note_l = note.lower()
    found = []
    for phrase in sorted(CTP_TOKENS, key=len, reverse=True):
        if phrase in note_l:
            found.append(phrase)
            note_l = note_l.replace(phrase, "")
    return found
```

Extend `CTP_TOKENS` with more clinical phrases as needed — the dictionary is
the entire "model," which is what keeps this compliant with the no-ML
constraint and fully explainable to a doctor.

---

## 6. Clinical Tokenization Protocol (CTP)

Converts a full clinical picture into a pipe-delimited record of a few dozen
bytes instead of an audio file or long text string.

```
Format:  PATIENT_ID | VITAL_TOKENS... | CLINICAL_TOKENS... | TRIAGE_TOKEN

Example: P104|V04|V05|R08|S12|C05|T_RED   (~30 bytes)
```

| Token | Meaning |
|---|---|
| `C05` | Unconscious |
| `S12` | Severe chest pain |
| `S10` | Chest pain |
| `R08` | Respiratory distress / breathing difficulty |
| `S20` | Severe bleeding |
| `S30` | Fracture |
| `S40` | High fever |
| `C10` | Seizure |
| `V04` | Critical SpO2 (< 85) |
| `V05` | Critical HR (> 130 or < 40) |
| `T_RED` / `T_YEL` / `T_GRN` | Triage category |

```python
VITAL_TOKENS = {"critical_spo2": "V04", "critical_hr": "V05"}
TRIAGE_TOKENS = {"RED": "T_RED", "YELLOW": "T_YEL", "GREEN": "T_GRN"}

def encode_ctp_record(patient_id: str, vitals: dict, note: str):
    result = score_and_triage(vitals, note)  # see Section 7
    parts = ([patient_id] + result["vital_tokens"]
              + result["clinical_tokens"] + [TRIAGE_TOKENS[result["triage"]]])
    return "|".join(parts), result
```

This is the second layer of bandwidth optimization (alongside fountain
coding): the *content itself* is shrunk before it ever gets fountain-coded
and transmitted.

---

## 7. Explainable Severity Scoring + Triage

Every rule is a plain if/then with a fixed point value — fully explainable to
a doctor after the fact, unlike a black-box ML classifier.

```python
SEVERITY_RULES = [
    (lambda v, t: v.get("spo2", 100) < 85, 5, "critical_spo2"),
    (lambda v, t: v.get("hr", 70) > 130, 4, "critical_hr"),
    (lambda v, t: "unconscious" in t, 5, None),
    (lambda v, t: "severe chest pain" in t, 4, None),
    (lambda v, t: "respiratory distress" in t or "breathing difficulty" in t, 4, None),
]

def score_and_triage(vitals: dict, note: str):
    entities = extract_clinical_entities(note)
    score, reasons, vital_tokens = 0, [], []
    for cond_fn, points, vtoken in SEVERITY_RULES:
        if cond_fn(vitals, entities):
            score += points
            reasons.append(vtoken or "clinical finding")
            if vtoken:
                vital_tokens.append(VITAL_TOKENS[vtoken])

    triage = "RED" if score >= 12 else "YELLOW" if score >= 6 else "GREEN"
    clinical_tokens = [CTP_TOKENS[e] for e in entities]
    return {"score": score, "triage": triage, "entities": entities,
            "clinical_tokens": clinical_tokens, "vital_tokens": vital_tokens,
            "reasons": reasons}
```

**Triage actions:**
- **RED** — immediate ambulance dispatch, doctor assigned immediately, highest transmission priority, continuous monitoring.
- **YELLOW** — medical equipment/oxygen dispatched, area team notified, priority doctor review.
- **GREEN** — continuous field monitoring, periodic vitals, auto-escalation if score rises.

---

## 8. Progressive Medical Image Transmission

- **Progressive wavelet coding**: bitstream ordered by diagnostic importance — a coarse thumbnail arrives first, later bytes sharpen it. (JPEG2000-style; `pywavelets` is a suitable library for the prototype.)
- **Fountain coding (LT / RaptorQ)** wraps the wavelet bitstream so reconstruction depends only on packet *count*, not *identity* — tolerant of >20% loss with zero retransmission.
- A tested, working reference implementation (peeling decoder, degree-distribution encoder, simulated 30% loss, frame-by-frame reconstruction) was built and verified earlier in this project — reuse that `fountain_demo.py` as the encode/decode core; swap the synthetic test image for the real wavelet-coded bitstream.

---

## 9. Transport Layer — Priority-Ordered Fountain Packets

Both the CTP record and the image bitstream are wrapped in fountain-coded
packets before transmission. Packet header carries enough metadata for
priority scheduling without needing to decode the payload first:

```
Packet header: [patient_id][triage_class][payload_type][degree][chunk_indices...][xor_payload]
```

- `triage_class` (RED/YELLOW/GREEN) lets the relay gateway schedule RED
  patients' packets first without decoding anything.
- `payload_type` distinguishes CTP-record packets from image packets — CTP
  records get higher redundancy (a late reading is useless), image packets
  get standard redundancy (late sharpening is fine).

---

## 10. Nearby Connections Mesh Layer (Android)

Used for local, infrastructure-free relay between field workers' phones when
no direct backhaul is available at the current location.

**Plan:**
- **Strategy**: `Strategy.P2P_CLUSTER` (many-to-many, suited for opportunistic mesh vs. a single fixed star topology).
- **Advertising/Discovery**: every field phone both advertises and discovers simultaneously, so any two phones in range can connect regardless of role.
- **Payload type**: `BYTES` payload for CTP records (tiny), `STREAM` or chunked `BYTES` for image fountain packets.
- **Store-and-forward logic**: each phone maintains a small local queue; on receiving a packet not addressed to itself, it re-broadcasts toward whichever connected peer has the best last-known link quality toward the gateway (this feeds directly into Quantum Module B's routing decision, computed on the gateway/hospital server from aggregated link-quality reports).
- **Permissions needed**: `BLUETOOTH_ADVERTISE`, `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`, `ACCESS_WIFI_STATE`, `CHANGE_WIFI_STATE`, `NEARBY_WIFI_DEVICES` (Android 13+).

---

## 11. Hospital Server — Quantum Decision Layer

Both modules are QUBO (quadratic unconstrained binary optimization) problems
— genuinely the class QAOA is designed for — solved periodically (every few
seconds, never per-packet), with a classical `SimulatedAnnealing` fallback on
the same `QuadraticProgram` if no quantum backend is reachable.

### 11.1 Module A — Severity-weighted bandwidth triage

The urgency input is no longer an arbitrary number — it's the same
explainable severity score from Section 7, normalized to 0–1. This ties the
NLP/CTP triage pipeline and the quantum optimization layer into one coherent
decision: **what the field worker's note and vitals say about urgency is
exactly what the quantum layer uses to ration bandwidth.**

```python
from qiskit_optimization import QuadraticProgram
from qiskit_optimization.algorithms import MinimumEigenOptimizer
from qiskit_algorithms import QAOA
from qiskit_algorithms.optimizers import COBYLA
from qiskit.primitives import Sampler

def triage_bandwidth_allocation(patients: dict, channel_budget_bytes: int):
    """
    patients: { patient_id: (severity_score_normalized_0_to_1, bytes_needed) }
    severity_score_normalized = severity_score / max_possible_score (Section 7)
    Returns: dict of patient_id -> bool (sent this cycle or not)
    """
    qp = QuadraticProgram()
    for pid in patients:
        qp.binary_var(pid)

    qp.maximize(linear={pid: urgency for pid, (urgency, cost) in patients.items()})
    qp.linear_constraint(
        linear={pid: cost for pid, (urgency, cost) in patients.items()},
        sense="<=", rhs=channel_budget_bytes, name="channel_budget",
    )

    qaoa = QAOA(sampler=Sampler(), optimizer=COBYLA(maxiter=100), reps=2)
    result = MinimumEigenOptimizer(qaoa).solve(qp)
    return {pid: bool(val) for pid, val in zip(patients.keys(), result.x)}
```

### 11.2 Module B — Mesh relay path selection

```python
def select_relay_path(edges: dict, source: str, sink: str, nodes: set):
    """
    edges: { "nodeA_nodeB": observed_loss_rate_0_to_1 }  -- from mesh link reports
    Returns: dict of edge -> bool (used in chosen path)
    NOTE: production version adds flow-conservation constraints per
    intermediate node (inflow == outflow); simplified here for clarity.
    """
    qp = QuadraticProgram()
    for e in edges:
        qp.binary_var(e)
    qp.minimize(linear={e: loss for e, loss in edges.items()})
    source_edges = {e: 1 for e in edges if e.startswith(source)}
    qp.linear_constraint(linear=source_edges, sense="==", rhs=1, name="leave_source")

    qaoa = QAOA(sampler=Sampler(), optimizer=COBYLA(maxiter=100), reps=2)
    result = MinimumEigenOptimizer(qaoa).solve(qp)
    return {e: bool(val) for e, val in zip(edges.keys(), result.x)}
```

**Classical fallback**: swap `QAOA` for a `SimulatedAnnealingOptimizer` on the
identical `QuadraticProgram` object if no quantum backend is reachable — the
QUBO formulation never changes, only the solver does.

**Runs on a normal laptop**: `qiskit-aer`'s simulator performs real quantum
circuit simulation on CPU (statevector/shot-based, not a mock). At 4–6
qubits (patients/edges), this completes in well under a second — no special
hardware needed for the prototype demo. IBM's free-tier Qiskit Runtime is an
optional later step to run on real quantum hardware, not a requirement.

---

## 12. Doctor Dashboard — Functional Spec

Data shown per patient:
- Patient ID, severity score, triage category (RED/YELLOW/GREEN badge)
- Decoded vitals + clinical tokens (human-readable, expanded from CTP)
- Progressive image (updates live as more fountain packets decode)
- Escalation history (score-over-time log)

**Buttons — must be wired to real state changes, not decorative:**

| Button | Behavior |
|---|---|
| `Dispatch Ambulance` | Sets patient status → `ambulance_dispatched`, timestamps the action, logs to escalation history |
| `Assign Doctor` | Opens doctor-select list, sets `assigned_doctor_id` on the patient record |
| `Acknowledge` | Marks the alert as seen by a doctor (`acknowledged_at` timestamp), stops re-alerting |
| `Request Full Image` | Triggers gateway to raise this patient's image redundancy/priority in Module A's next optimization cycle |
| `View Escalation History` | Opens a timeline view built from the score log recorded at each update cycle |
| `Mark Resolved` | Closes the case, removes from active triage queue, archives record |
| `Re-run Triage` | Re-invokes Section 7 scoring on the latest vitals/note (for manual re-check) |

This should be built as real event handlers against a shared patient-record
state (not mock UI) so the prototype is genuinely operable end-to-end during
a demo.

---

## 13. Suggested Repo Structure (for scaffolding)

```
medlink/
├── esp32-firmware/          # vitals sensor firmware (BLE stream only)
├── field-app/                # phone app
│   ├── nlp/                  # clinical_nlp.py (Section 5)
│   ├── ctp/                  # ctp_encoder.py (Section 6)
│   ├── triage/                # severity_scoring.py (Section 7)
│   ├── imaging/               # wavelet_encoder.py (Section 8)
│   ├── transport/             # fountain_codec.py (Section 8-9)
│   └── mesh/                  # nearby_connections_bridge (Section 10)
├── gateway-server/
│   ├── decode/                 # fountain decode, CTP decode
│   ├── quantum/                # triage_qaoa.py, routing_qaoa.py (Section 11)
│   └── scheduler/              # priority-ordered relay logic
└── doctor-dashboard/
    ├── ui/                      # patient cards, triage badges, image viewer
    └── actions/                 # button handlers wired to patient-record state
```

---

## 14. Constraint Compliance Summary

| Constraint | How it's met |
|---|---|
| No centralized ML | Clinical NLP is deterministic phrase-matching; severity scoring is a fixed rule table; image/vitals coding is wavelet + fountain coding; quantum modules are QUBO optimization, not learned models |
| >20% packet loss | Fountain (LT/RaptorQ) coding — reconstruction depends on packet count, not identity |
| <64 kbps bandwidth | CTP shrinks a full clinical picture to ~30 bytes; progressive wavelet imaging makes partial data useful; severity-weighted quantum triage rations what little bandwidth exists toward the most urgent patients first |
| Lightweight client | ESP32 does sensor I/O only; phone-side NLP/CTP/fountain logic has no ML runtime dependency |
| Quantum used meaningfully | Confined to two periodic optimization decisions (bandwidth triage, mesh routing), fed by the same explainable severity score doctors already see — not decorative, not in the real-time packet path, with classical fallback |

---

## 15. Demo Narrative (for pitch)

1. Speak/type a field observation → show it collapse into a ~30-byte CTP record live.
2. Show the severity score and RED/YELLOW/GREEN classification derive transparently from that record.
3. Run the fountain-coding demo on a medical image under 30% simulated loss → full reconstruction, zero retransmissions.
4. Run Module A live: multiple patients queued, tight bandwidth budget, watch the RED patient's data get selected first — driven by the same severity score just shown.
5. Close on the dashboard: dispatch the ambulance with one click, show the action logged to escalation history in real time.
