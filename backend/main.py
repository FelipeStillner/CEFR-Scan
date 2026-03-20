import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
from .llm_extract import extract_via_ollama
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
    try:
        return extract_via_ollama(req)
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama request failed (is Ollama running?). {e!s}",
        ) from e
    except (ValueError, ValidationError) as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not parse or validate LLM output: {e!s}",
        ) from e

