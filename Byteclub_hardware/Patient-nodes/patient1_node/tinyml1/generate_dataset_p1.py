"""
Patient 1 (Yokes node) -- sensors: MAX30100 + DHT11 only.
Features: hr, spo2, temp, humidity

Conditions detectable from THIS sensor set only:
    NORMAL
    HYPOXIA      - low SpO2
    TACHYCARDIA  - high HR
    BRADYCARDIA  - low HR
    FEVER        - high temp
    HEAT_STRESS  - high temp + high humidity together
"""

import numpy as np
import csv

np.random.seed(42)

rows = []

def normal_base():
    hr = np.random.normal(75, 8)
    spo2 = np.random.normal(97.5, 1.0)
    temp = np.random.normal(36.8, 0.3)
    humidity = np.random.normal(45, 8)
    return hr, spo2, temp, humidity

N_NORMAL = 400
N_OTHER = 80

for _ in range(N_NORMAL):
    rows.append([*normal_base(), "NORMAL"])

for _ in range(N_OTHER):
    _, _, temp, humidity = normal_base()
    hr = np.random.normal(75, 8)
    spo2 = np.random.normal(87, 3)
    rows.append([hr, spo2, temp, humidity, "HYPOXIA"])

for _ in range(N_OTHER):
    _, spo2, temp, humidity = normal_base()
    hr = np.random.normal(135, 12)
    rows.append([hr, spo2, temp, humidity, "TACHYCARDIA"])

for _ in range(N_OTHER):
    _, spo2, temp, humidity = normal_base()
    hr = np.random.normal(42, 6)
    rows.append([hr, spo2, temp, humidity, "BRADYCARDIA"])

for _ in range(N_OTHER):
    hr, spo2, _, humidity = normal_base()
    temp = np.random.normal(39.2, 0.5)
    hr = np.random.normal(100, 10)
    rows.append([hr, spo2, temp, humidity, "FEVER"])

for _ in range(N_OTHER):
    hr, spo2, _, _ = normal_base()
    temp = np.random.normal(38.3, 0.4)
    humidity = np.random.normal(80, 6)
    hr = np.random.normal(115, 10)
    rows.append([hr, spo2, temp, humidity, "HEAT_STRESS"])

rows_arr = np.array(rows, dtype=object)
np.random.shuffle(rows_arr)

with open("vitals_dataset_p1.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["hr", "spo2", "temp", "humidity", "label"])
    writer.writerows(rows_arr)

labels, counts = np.unique(rows_arr[:, -1], return_counts=True)
print(f"Patient 1 dataset: {len(rows_arr)} samples")
for l, c in zip(labels, counts):
    print(f"  {l}: {c}")
