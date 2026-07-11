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
    current_temp = 37.0 # Switched to Celsius for medical standard as requested
    current_humidity = 45.0
    current_battery = 85
    
    try:
        while True:
            # Random walk for vitals
            current_hr = max(60, min(140, current_hr + random.randint(-2, 2)))
            current_spo2 = max(85, min(100, current_spo2 + random.randint(-1, 1)))
            current_temp = max(36.0, min(40.0, current_temp + random.uniform(-0.1, 0.1)))
            current_humidity = max(30.0, min(60.0, current_humidity + random.uniform(-0.5, 0.5)))
            
            # Slow battery drain
            if random.random() > 0.9:
                current_battery = max(0, current_battery - 1)
                
            # Random RSSI fluctuation
            rssi = random.randint(-75, -50)
            
            data = {
                "timestamp": int(time.time() * 1000),
                "device_id": "ESP32-MED-NODE-01",
                "firmware": "v2.1.4-stable",
                "ble_status": "Connected",
                "hr": current_hr,
                "spo2": current_spo2,
                "temp": round(current_temp, 1),
                "humidity": round(current_humidity, 1),
                "battery": current_battery,
                "rssi": rssi
            }
            await websocket.send_text(json.dumps(data))
            await asyncio.sleep(1) # Send every 1 second
            
    except WebSocketDisconnect:
        pass
