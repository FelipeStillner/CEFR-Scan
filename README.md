# CEFR-Scan

Paste an English text, choose a CEFR level, and the app extracts words/expressions/phrases that should fit that level. It highlights matches in the text and shows a ranked list; clicking an item can reveal an English definition, examples, and a short “why this matches”.

## MVP status (current repo)

- Frontend + backend API contract are wired.
- Extraction logic is stubbed for now: `POST /api/extract` returns `highlights: []` and `items: []`.

## Stack

- Frontend: Next.js (React + TypeScript) in `frontend/`
- Backend/API: FastAPI in `backend/` (`backend/main.py`)
- Future: Python modules for candidate generation + CEFR ranking + optional LLM enrichment

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

Frontend API base URL: `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:8000`).

## Implementation (high level)

The `extract` route is intended to:

1. Generate candidates from `req.text` (single words + multi-word expressions) and record each occurrence as character offsets `{start,end}`.
2. Score/rank candidates for `req.level` and return a sorted `items[]` list.
3. (Optional) Enrich top-N items with English-only `definition`, `examples`, and `whyThisMatches`.

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

Current stub response:

`{ "level": <requested>, "highlights": [], "items": [] }`

Types live in `backend/schemas.py`.

## Ideas for implementing `extract` (backend/main.py)

Pseudocode outline:

- Validate `ExtractRequest` (`text`, `level`)
- Candidate generation:
  - tokenize + lemmatize
  - generate n-grams/collocations
  - collect occurrences with `{start,end}` offsets
- CEFR scoring:
  - compute features (frequency/basicness proxy, complexity, lemma/morph fit, context fit)
  - convert to `levelScore` (and optionally `levelProbabilities`)
- Response shaping:
  - group occurrences into `highlights[]`
  - build ranked `items[]` (1 entry per canonical term/phrase)
- (Optional) top-N enrichment:
  - fill `definition`, `examples`, `whyThisMatches` (English-only)

## Key files

- `backend/main.py`, `backend/schemas.py`
- `frontend/src/app/page.tsx`
- `Makefile`
