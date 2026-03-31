from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
from .dictionary_definitions import define_terms_from_dictionary
from .llm_extract import extract_via_llm
from .llm_quiz import generate_quiz_one
from .llm_quiz_two import generate_quiz_two
from .schemas import (
    DefinitionsRequest,
    DefinitionsResponse,
    ExtractRequest,
    ExtractResponse,
    QuizOneRequest,
    QuizOneResponse,
    QuizTwoRequest,
    QuizTwoResponse,
    TranslateRequest,
    TranslateResponse,
)
from .translation_mymemory import translate_via_mymemory

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
        return extract_via_llm(req)
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Gemini request failed. {e!s}",
        ) from e
    except (ValueError, ValidationError) as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not parse or validate LLM output: {e!s}",
        ) from e


@app.post("/api/definitions", response_model=DefinitionsResponse)
async def definitions(req: DefinitionsRequest) -> DefinitionsResponse:
    try:
        return await define_terms_from_dictionary(req)
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Dictionary request failed. {e!s}",
        ) from e
    except (ValueError, ValidationError) as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not build definitions response: {e!s}",
        ) from e


@app.post("/api/translate", response_model=TranslateResponse)
async def translate(req: TranslateRequest) -> TranslateResponse:
    try:
        return await translate_via_mymemory(req)
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Translation request failed. {e!s}",
        ) from e
    except (ValueError, ValidationError) as e:
        raise HTTPException(
            status_code=502,
            detail=str(e),
        ) from e


@app.post("/api/quiz-one", response_model=QuizOneResponse)
def quiz_one(req: QuizOneRequest) -> QuizOneResponse:
    try:
        return generate_quiz_one(req)
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Quiz generation request failed. {e!s}",
        ) from e
    except (ValueError, ValidationError) as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not build quiz: {e!s}",
        ) from e


@app.post("/api/quiz-two", response_model=QuizTwoResponse)
def quiz_two(req: QuizTwoRequest) -> QuizTwoResponse:
    try:
        return generate_quiz_two(req)
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Quiz generation request failed. {e!s}",
        ) from e
    except (ValueError, ValidationError) as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not build quiz: {e!s}",
        ) from e

