import os
import tempfile
from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
import re

router = APIRouter()

# Lazy-load whisper so the app doesn't crash if it's not installed immediately during startup
model = None

def get_whisper_model():
    global model
    if model is None:
        try:
            from faster_whisper import WhisperModel
            import torch
            
            device = "cuda" if torch.cuda.is_available() else "cpu"
            compute_type = "float16" if device == "cuda" else "int8"
            
            # Using small.en as requested, fallback to cpu/int8 handled above
            model = WhisperModel("small.en", device=device, compute_type=compute_type)
        except ImportError:
            print("WARNING: faster-whisper not installed. Returning mock transcript.")
            return None
    return model

# Deterministic Clinical Phrase Normalization Engine
NORMALIZATION_DICT = {
    r"\b(not responding|passed out|loss of consciousness|unresponsive)\b": "unconscious",
    r"\b(cannot breathe|shortness of breath|having trouble breathing|struggling to breathe)\b": "breathing difficulty",
    r"\b(intense chest pain|crushing chest pain|heart attack symptoms)\b": "severe chest pain",
    r"\b(heavy bleeding|massive blood loss)\b": "severe bleeding",
    r"\b(high temperature|running fever)\b": "high fever"
}

def normalize_clinical_text(text: str) -> str:
    normalized = text.lower()
    for pattern, replacement in NORMALIZATION_DICT.items():
        normalized = re.sub(pattern, replacement, normalized)
    
    # Capitalize first letter for presentation
    if normalized:
        normalized = normalized[0].upper() + normalized[1:]
    return normalized

@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    # Save uploaded audio to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        whisper_model = get_whisper_model()
        
        if whisper_model:
            # Transcribe
            segments, info = whisper_model.transcribe(tmp_path, beam_size=5)
            raw_transcript = " ".join([segment.text for segment in segments]).strip()
        else:
            # Fallback for dev environment without faster-whisper installed
            raw_transcript = "Patient is not responding and having trouble breathing with crushing chest pain."
            
        normalized_transcript = normalize_clinical_text(raw_transcript)
        
        return {
            "raw_transcript": raw_transcript,
            "normalized_transcript": normalized_transcript
        }
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
