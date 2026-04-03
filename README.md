# Scan & Study

A small full-stack app for **English learners**: paste a text, choose a proficiency band (**Beginner**, **Intermediary**, or **Advanced**), and get suggested vocabulary to study. You then edit a word list, take a **text-based vocabulary quiz**, review **definitions** and optional **translations**, and finish with a **generated mixed-skills final quiz** (passage + vocabulary).

The UI is a **five-step flow** in the browser (classroom-style layout). Progress is kept in **session storage** so you can refresh or move between steps without losing the current session (until you start over or close the tab).

## Current feature set

| Step | Route | What happens |
| --- | --- | --- |
| 1 · Text | `/` | Paste text, pick level, **run scan** → calls `POST /api/extract` and saves terms. |
| 2 · Words | `/vocabulary` | Click words in the text or add/remove manually; need **≥ 4 words** to continue. |
| 3 · Quiz A | `/quiz` | **Generated** multiple-choice quiz from your text + word list (`POST /api/quiz-one`). |
| 4 · Review | `/review` | **Definitions** (`POST /api/definitions`) and optional **translations** (`POST /api/translate`). |
| 5 · Quiz B | `/final-quiz` | **Generated** mixed-skills quiz: reading + harder vocabulary (`POST /api/quiz-two`). |

Public URLs (`/vocabulary`, `/quiz`, …) are **rewritten** in Next.js to the real pages under `frontend/src/app/features/…` (see `frontend/next.config.js`).

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | **Next.js** (App Router, React, TypeScript), `frontend/` |
| Backend | **FastAPI** (`backend/main.py`) |
| Extract & quiz generation | **Google Gemini** (HTTP API via `httpx`) — `backend/llm_extract.py`, `backend/llm_quiz.py`, `backend/llm_quiz_two.py` |
| Definitions | Free dictionary API — `backend/dictionary_definitions.py` |
| Translation | MyMemory API — `backend/translation_mymemory.py` |

## Prerequisites

- **Python 3** + **Node.js** (with npm)
- **Gemini API key** for extract and quiz-one (see below)
- Optional: `.env` at the repo root (loaded by the backend) for `GEMINI_API_KEY` and other settings

## Run locally

```bash
make install-backend
make install-frontend
```

### Backend (API on port **8000**)

```bash
make run-backend
```

- Health: `http://localhost:8000/health`
- OpenAPI docs: `http://localhost:8000/docs` (FastAPI auto-docs)

### Frontend (UI on port **3000**)

```bash
make run-frontend
```

- App: `http://localhost:3000`

### Backend + frontend together

```bash
make dev
```

Runs the API and Next.js **in parallel** (`make -j2`).

### Frontend → API URL

Set **`NEXT_PUBLIC_API_BASE_URL`** when building or running the frontend if the API is not on `http://localhost:8000` (default in code).

## Environment variables (backend)

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | **Required** for `POST /api/extract`, `POST /api/quiz-one`, and `POST /api/quiz-two` (Gemini). |
| `GEMINI_BASE_URL` | Optional override (default: Google Generative Language API). |
| `GEMINI_MODEL` | Optional model name (default in code: `gemini-2.5-flash`). |

Other integrations (dictionary, MyMemory) may use their own defaults or env vars — see the corresponding modules under `backend/`.

## API overview

| Method | Path | Role |
| --- | --- | --- |
| `GET` | `/health` | Liveness check |
| `POST` | `/api/extract` | `{ text, level }` → `{ vocabulary: [{ term }] }` |
| `POST` | `/api/definitions` | `{ terms }` → definitions per term |
| `POST` | `/api/translate` | `{ text, target_lang }` → translated text |
| `POST` | `/api/quiz-one` | `{ text, terms }` → generated vocabulary-in-context quiz |
| `POST` | `/api/quiz-two` | `{ text, terms, level }` → harder mixed quiz (comprehension + vocabulary) |

Request/response shapes are defined in **`backend/schemas.py`**.

### Example: extract

**Request**

```json
{ "text": "The quick brown fox...", "level": "Beginner" }
```

**Response**

```json
{ "vocabulary": [{ "term": "however" }, { "term": "vacation" }] }
```

`level` must be one of: `"Beginner"`, `"Intermediary"`, `"Advanced"`.

## Frontend layout (high level)

- **`frontend/src/app/features/`** — Route groups: `input/`, `vocabulary/`, `quiz/`, `review/`, `final-quiz/` (pages + step-specific UI).
- **`frontend/src/app/components/`** — Shared UI: `ScanStepHeader`, `ScanStepNav`, `QuizPanel`.
- **`frontend/src/app/helpers/`** — Session helpers, routes, quiz copy, etc.
- **`frontend/src/app/types/`** — Shared TypeScript types.

Root **`frontend/src/app/page.tsx`** re-exports the first step from `features/input/`.

## Implementation notes

1. **Extract**: builds a prompt with the user text and level, calls Gemini, parses JSON into `ExtractResponse`, validates with Pydantic.
2. **Quiz one**: Gemini generates vocabulary-in-context questions tied to the passage and selected terms.
3. **Quiz two (final)**: Gemini returns eight questions—four on the passage (main idea, detail, inference) and four harder vocabulary items aligned with the first four selected terms (options drawn from the full word list).
4. **Frontend session**: stored under `sessionStorage` key `scan-study-workflow-session` (see `frontend/src/app/helpers/workflowSession.ts`).

## Key files

| Area | Files |
| --- | --- |
| API | `backend/main.py`, `backend/schemas.py`, `backend/llm_extract.py`, `backend/llm_quiz.py`, `backend/llm_quiz_two.py` |
| Frontend entry | `frontend/src/app/page.tsx`, `frontend/src/app/layout.tsx`, `frontend/src/app/globals.css` |
| Rewrites | `frontend/next.config.js` |
| Automation | `Makefile` |
