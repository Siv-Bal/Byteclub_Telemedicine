from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
import random
import time

router = APIRouter()

# Mock ESP32 vitals stream via WebSocket
@router.websocket("/vitals/ws")
async def vitals_websocket(websocket: WebSocket):
    await websocket.accept()
    # Baseline vitals
    current_hr = 75
    current_spo2 = 98
    current_temp = 98.6
    
    try:
        while True:
            # Random walk for vitals
            current_hr = max(60, min(140, current_hr + random.randint(-2, 2)))
            current_spo2 = max(80, min(100, current_spo2 + random.randint(-1, 1)))
            current_temp = max(97.0, min(101.0, current_temp + random.uniform(-0.1, 0.1)))
            
            data = {
                "timestamp": int(time.time() * 1000),
                "hr": current_hr,
                "spo2": current_spo2,
                "temp": round(current_temp, 1)
            }
            await websocket.send_text(json.dumps(data))
            await asyncio.sleep(1) # Send every 1 second
            
    except WebSocketDisconnect:
        pass
