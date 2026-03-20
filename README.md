# CEFR-Scan

Paste an English text, choose a CEFR level, and the app extracts words/expressions/phrases that should fit that level. It highlights matches in the text and shows a ranked list; clicking an item can reveal an English definition, examples, and a short “why this matches”.

## MVP status (current repo)

- Frontend + backend API contract are wired.
- `POST /api/extract` calls a **local Ollama** model (`format: json`) with the user text and CEFR level, then parses the JSON into `highlights` and `items`.
- Requires [Ollama](https://ollama.com) running (default `http://localhost:11434`) and a pulled model (see env vars below).

## Stack

- Frontend: Next.js (React + TypeScript) in `frontend/`
- Backend/API: FastAPI in `backend/` (`backend/main.py`, `backend/llm_extract.py`)
- LLM: local Ollama HTTP API (`httpx`)

## Run locally

Prerequisites: Python 3, Node.js + npm.

### Backend

```bash
make install-backend
make run-backend
```

- API: `http://localhost:8000/api/extract`
- Health: `http://localhost:8000/health`

### Frontend

```bash
make install-frontend
make run-frontend
```

- UI: `http://localhost:3000`

### Or both

```bash
make dev
```

This runs `ollama serve` in the background if Ollama is not already reachable on `http://127.0.0.1:11434`, then starts the API and Next.js in parallel (`make -j2`). Override the check URL with `make dev OLLAMA_URL=http://host:11434` if needed.

Frontend API base URL: `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:8000`).

### Ollama (backend)

| Variable | Default | Meaning |
| --- | --- | --- |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server base URL |
| `OLLAMA_MODEL` | `llama3.2` | Model name (`ollama pull <name>`) |

Example: `OLLAMA_MODEL=mistral ollama pull mistral` then run the backend.

## Implementation (high level)

1. Build a system + user prompt with the exact text and requested CEFR level.
2. `POST` to Ollama `/api/chat` with `format: json`.
3. Parse assistant `content` as JSON and validate with `ExtractResponse` (`backend/schemas.py`). The server forces `level` from the request.

The frontend renders:

- Highlights from `highlights[].occurrences[]` (offsets into the original text).
- Cards from `items[]`, including the optional explanation fields.

## API contract: `POST /api/extract`

### Request

```json
{ "text": "The quick brown fox...", "level": "B1" }
```

### Response shape

```json
{
  "level": "B1",
  "highlights": [
    { "term": "however", "occurrences": [{ "start": 0, "end": 7 }] }
  ],
  "items": [
    {
      "term": "however",
      "canonical": "however",
      "kind": "adverb",
      "levelScore": 0.81,
      "definition": "used to show contrast between two statements",
      "examples": ["I wanted to go out; however, it started raining."],
      "whyThisMatches": "..."
    }
  ]
}
```

If Ollama is down or the model returns invalid JSON, the API responds with `503` or `502` and an error `detail`.

Types live in `backend/schemas.py`.

## Key files

- `backend/main.py`, `backend/llm_extract.py`, `backend/schemas.py`
- `frontend/src/app/page.tsx`
- `Makefile`
