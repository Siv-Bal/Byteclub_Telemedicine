"""
Patient 2 (Karthik node) -- sensors: ECG + MQ9 only. No MAX30100, no DHT11.
Features: ecg_hr (heart rate derived from ECG peak intervals),
          ecg_var (rolling variance of raw ECG signal -- irregularity proxy),
          gas_ppm (MQ9 analog reading -- CO/combustible gas proxy for
                   air quality / respiratory stress, NOT true CO2)

Conditions detectable from THIS sensor set only:
    NORMAL
    TACHYCARDIA           - high ECG-derived HR
    BRADYCARDIA           - low ECG-derived HR
    ARRHYTHMIA_SUSPECTED  - high ECG variability (irregular signal)
    RESP_DISTRESS         - elevated gas/air-quality reading, often with
                            compensatory HR rise
"""

import numpy as np
import csv

np.random.seed(42)

rows = []

def normal_base():
    ecg_hr = np.random.normal(75, 8)
    ecg_var = np.random.normal(0.05, 0.02)
    gas_ppm = np.random.normal(50, 15)
    return ecg_hr, ecg_var, gas_ppm

N_NORMAL = 400
N_OTHER = 100

for _ in range(N_NORMAL):
    rows.append([*normal_base(), "NORMAL"])

for _ in range(N_OTHER):
    _, ecg_var, gas_ppm = normal_base()
    ecg_hr = np.random.normal(135, 12)
    rows.append([ecg_hr, ecg_var, gas_ppm, "TACHYCARDIA"])

for _ in range(N_OTHER):
    _, ecg_var, gas_ppm = normal_base()
    ecg_hr = np.random.normal(42, 6)
    rows.append([ecg_hr, ecg_var, gas_ppm, "BRADYCARDIA"])

for _ in range(N_OTHER):
    ecg_hr, _, gas_ppm = normal_base()
    ecg_var = np.random.normal(0.35, 0.08)
    rows.append([ecg_hr, ecg_var, gas_ppm, "ARRHYTHMIA_SUSPECTED"])

for _ in range(N_OTHER):
    _, ecg_var, _ = normal_base()
    gas_ppm = np.random.normal(220, 40)
    ecg_hr = np.random.normal(105, 10)
    rows.append([ecg_hr, ecg_var, gas_ppm, "RESP_DISTRESS"])

rows_arr = np.array(rows, dtype=object)
np.random.shuffle(rows_arr)

with open("vitals_dataset_p2.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["ecg_hr", "ecg_var", "gas_ppm", "label"])
    writer.writerows(rows_arr)

labels, counts = np.unique(rows_arr[:, -1], return_counts=True)
print(f"Patient 2 dataset: {len(rows_arr)} samples")
for l, c in zip(labels, counts):
    print(f"  {l}: {c}")
