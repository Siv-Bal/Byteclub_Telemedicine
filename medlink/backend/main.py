from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import nlp, quantum, fountain, vitals

app = FastAPI(title="MedLink Backend API")

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nlp.router, prefix="/api")
app.include_router(quantum.router, prefix="/api")
app.include_router(fountain.router, prefix="/api")
app.include_router(vitals.router, prefix="/api")

@app.get("/")
def read_root():
    return {"status": "MedLink Backend API is running"}
