from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.tone_maker import Gp200PatchResponse, Gp200ToneRequest, build_gp200_patch

app = FastAPI(title="GuitarLab AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=False,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "guitarlab-ai-backend"}


@app.post("/tone-maker/gp200", response_model=Gp200PatchResponse)
def create_gp200_tone(request: Gp200ToneRequest):
    return build_gp200_patch(request)
