import csv
import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix
import pickle

CLASSES = ["NORMAL", "TACHYCARDIA", "BRADYCARDIA", "ARRHYTHMIA_SUSPECTED", "RESP_DISTRESS"]
CLASS_TO_IDX = {c: i for i, c in enumerate(CLASSES)}

X, y = [], []
with open("vitals_dataset_p2.csv") as f:
    reader = csv.DictReader(f)
    for row in reader:
        X.append([float(row["ecg_hr"]), float(row["ecg_var"]), float(row["gas_ppm"])])
        y.append(CLASS_TO_IDX[row["label"]])

X = np.array(X)
y = np.array(y)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)

clf = DecisionTreeClassifier(max_depth=6, min_samples_leaf=4, random_state=42)
clf.fit(X_train, y_train)
y_pred = clf.predict(X_test)

print("=== PATIENT 2 MODEL: Per-condition sensitivity ===")
cm = confusion_matrix(y_test, y_pred, labels=range(len(CLASSES)))
for i, cls in enumerate(CLASSES):
    total = cm[i].sum()
    correct = cm[i][i]
    sens = correct / total if total > 0 else float("nan")
    tag = "" if cls == "NORMAL" else "  (requirement: >=85%)"
    print(f"  {cls:22s}: {correct}/{total} = {sens*100:.1f}%{tag}")

normal_idx = CLASS_TO_IDX["NORMAL"]
normal_mask = (y_test == normal_idx)
false_alarm_rate = (y_pred[normal_mask] != normal_idx).sum() / normal_mask.sum()
abnormal_mask = (y_test != normal_idx)
overall_sensitivity = (y_pred[abnormal_mask] != normal_idx).sum() / abnormal_mask.sum()

print(f"\nFalse-alarm rate: {false_alarm_rate*100:.1f}%  (requirement: <15%)")
print(f"Overall sensitivity: {overall_sensitivity*100:.1f}%  (requirement: >=85%)")
print(f"PASS sensitivity: {overall_sensitivity >= 0.85} | PASS false-alarm: {false_alarm_rate < 0.15}")

with open("model_p2.pkl", "wb") as f:
    pickle.dump(clf, f)
print(f"\nSaved -> model_p2.pkl | Tree depth: {clf.get_depth()}, leaves: {clf.get_n_leaves()}")
