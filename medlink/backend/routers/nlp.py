import re
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List

router = APIRouter()

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

VITAL_TOKENS = {
    "critical_spo2": "V04",
    "critical_hr":   "V05",
}

TRIAGE_TOKENS = {"RED": "T_RED", "YELLOW": "T_YEL", "GREEN": "T_GRN"}

SEVERITY_RULES = [
    (lambda v, t: v.get("spo2", 100) < 85, 5, "critical_spo2"),
    (lambda v, t: v.get("hr", 70) > 130 or v.get("hr", 70) < 40, 4, "critical_hr"),
    (lambda v, t: "unconscious" in t, 5, None),
    (lambda v, t: "severe chest pain" in t, 4, None),
    (lambda v, t: "respiratory distress" in t or "breathing difficulty" in t, 4, None),
    (lambda v, t: "severe bleeding" in t, 4, None),
    (lambda v, t: "fracture" in t, 3, None),
    (lambda v, t: "high fever" in t, 2, None),
    (lambda v, t: "seizure" in t, 4, None),
]

def extract_clinical_entities(note: str) -> List[str]:
    note_l = note.lower()
    found = []
    for phrase in sorted(CTP_TOKENS, key=len, reverse=True):
        if phrase in note_l:
            found.append(phrase)
            note_l = note_l.replace(phrase, "")
    return found

def score_and_triage(vitals: dict, note: str):
    entities = extract_clinical_entities(note)
    score = 0
    reasons = []
    vital_tokens = []
    for cond_fn, points, vtoken in SEVERITY_RULES:
        if cond_fn(vitals, entities):
            score += points
            if vtoken:
                vital_tokens.append(VITAL_TOKENS[vtoken])
                reasons.append(vtoken)
            else:
                reasons.append("clinical finding")

    if score >= 12:
        triage = "RED"
    elif score >= 6:
        triage = "YELLOW"
    else:
        triage = "GREEN"

    clinical_tokens = [CTP_TOKENS[e] for e in entities]
    return {
        "score": score,
        "triage": triage,
        "entities": entities,
        "clinical_tokens": clinical_tokens,
        "vital_tokens": vital_tokens,
        "reasons": reasons,
    }

class EncodeRequest(BaseModel):
    patient_id: str
    vitals: Dict[str, Any]
    note: str

@router.post("/encode-ctp")
def encode_ctp(req: EncodeRequest):
    result = score_and_triage(req.vitals, req.note)
    parts = [req.patient_id] + result["vital_tokens"] + result["clinical_tokens"] + [TRIAGE_TOKENS[result["triage"]]]
    encoded = "|".join(parts)
    return {
        "encoded": encoded,
        "bytes": len(encoded.encode('utf-8')),
        "result": result
    }
