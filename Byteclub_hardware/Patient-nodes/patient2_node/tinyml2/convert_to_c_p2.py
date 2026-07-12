import pickle
from micromlgen import port

with open("model_p2.pkl", "rb") as f:
    clf = pickle.load(f)

CLASSES = ["NORMAL", "TACHYCARDIA", "BRADYCARDIA", "ARRHYTHMIA_SUSPECTED", "RESP_DISTRESS"]
classmap = {i: c for i, c in enumerate(CLASSES)}
c_code = port(clf, classmap=classmap)

with open("model_p2.h", "w") as f:
    f.write(c_code)
print("Wrote model_p2.h")
