import pickle
from micromlgen import port

with open("model_p1.pkl", "rb") as f:
    clf = pickle.load(f)

CLASSES = ["NORMAL", "HYPOXIA", "TACHYCARDIA", "BRADYCARDIA", "FEVER", "HEAT_STRESS"]
classmap = {i: c for i, c in enumerate(CLASSES)}
c_code = port(clf, classmap=classmap)

with open("model_p1.h", "w") as f:
    f.write(c_code)
print("Wrote model_p1.h")
