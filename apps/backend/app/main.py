from fastapi import FastAPI

app = FastAPI(title="GuitarLab AI API")


@app.get("/health")
def health():
    return {"status": "ok", "service": "guitarlab-ai-backend"}
