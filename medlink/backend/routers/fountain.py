from fastapi import APIRouter
from pydantic import BaseModel
import pywt
import numpy as np
import random
import math

router = APIRouter()

class FountainRequest(BaseModel):
    loss_percentage: float

def simple_fountain_encode_decode(loss_percentage: float):
    # Create a simple synthetic 64x64 "medical" image (a circle representing a cell/tumor)
    img = np.zeros((64, 64), dtype=np.float32)
    for i in range(64):
        for j in range(64):
            if (i - 32)**2 + (j - 32)**2 < 15**2:
                img[i, j] = 255.0
            else:
                img[i, j] = random.uniform(0, 50) # noise
    
    # 1. Wavelet transform
    coeffs = pywt.wavedec2(img, 'haar', level=2)
    cA2, (cH2, cV2, cD2), (cH1, cV1, cD1) = coeffs
    
    # Flatten components (prioritizing cA2)
    chunks = [
        cA2.flatten(),
        cH2.flatten(), cV2.flatten(), cD2.flatten(),
        cH1.flatten(), cV1.flatten(), cD1.flatten()
    ]
    
    # 2. Simulate transmission and packet loss
    # Each chunk is a "packet"
    total_packets = len(chunks)
    packets_lost = 0
    received_chunks = []
    
    for i, chunk in enumerate(chunks):
        # We apply loss, but cA2 (index 0) has a lower chance or we just simulate general loss
        # In a real fountain code, we'd send random XOR combinations until the receiver can solve the linear system
        # Here we simulate the *result* of a peeling decoder:
        # A peeling decoder successfully decodes with high probability if we receive slightly more packets than the original count K.
        # But for the UI demo, we want progressive refinement.
        
        # Actually, let's just simulate the visual result directly for the prototype:
        if random.random() < loss_percentage / 100.0 and i != 0: 
            # Force keep chunk 0 (base image) so we have something to show, and lose others randomly
            packets_lost += 1
            received_chunks.append(np.zeros_like(chunk)) # lost chunk replaced with zeros
        else:
            received_chunks.append(chunk)

    # 3. Reconstruct
    rec_coeffs = [
        received_chunks[0].reshape(cA2.shape),
        (received_chunks[1].reshape(cH2.shape), received_chunks[2].reshape(cV2.shape), received_chunks[3].reshape(cD2.shape)),
        (received_chunks[4].reshape(cH1.shape), received_chunks[5].reshape(cV1.shape), received_chunks[6].reshape(cD1.shape))
    ]
    
    reconstructed_img = pywt.waverec2(rec_coeffs, 'haar')
    reconstructed_img = np.clip(reconstructed_img, 0, 255)

    return {
        "original": img.tolist(),
        "reconstructed": reconstructed_img.tolist(),
        "stats": {
            "packets_sent": total_packets + int((total_packets * loss_percentage) / 100.0), # representing redundancy sent
            "packets_lost": packets_lost,
            "chunks_recovered": total_packets - packets_lost
        }
    }

@router.post("/fountain-demo")
def fountain_demo(req: FountainRequest):
    result = simple_fountain_encode_decode(req.loss_percentage)
    return result
