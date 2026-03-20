from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .schemas import ExtractRequest, ExtractResponse

app = FastAPI(title="CEFR-Scan API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/api/extract", response_model=ExtractResponse)
def extract(req: ExtractRequest) -> ExtractResponse:
    return ExtractResponse(level=req.level, highlights=[], items=[])

