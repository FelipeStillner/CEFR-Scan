SHELL := /bin/zsh

VENV_DIR := .venv
PY := $(VENV_DIR)/bin/python
UVICORN := $(VENV_DIR)/bin/uvicorn

OLLAMA_URL ?= http://127.0.0.1:11434

.PHONY: help install-backend run-backend install-frontend run-frontend run-ollama dev eval clean


help:
	@echo "Common targets:"
	@echo "  make install-backend   # create venv + install backend deps"
	@echo "  make run-backend       # start FastAPI on :8000"
	@echo "  make install-frontend  # npm install in frontend/"
	@echo "  make run-frontend      # start Next.js dev server (port 3000)"
	@echo "  make run-ollama        # start Ollama server if not already up (:11434)"
	@echo "  make dev               # ensure Ollama, then run backend + frontend (parallel)"
	@echo "  make eval              # run eval fixtures; save responses under eval/runs/"
	@echo "  make clean             # remove venv + frontend build artifacts"

install-backend:
	@python3 -m venv $(VENV_DIR)
	@$(PY) -m pip install --upgrade pip
	@$(PY) -m pip install -r backend/requirements.txt

run-backend: install-backend
	@$(UVICORN) backend.main:app --reload --port 8000

install-frontend:
	@cd frontend && npm install

run-frontend: install-frontend
	@cd frontend && npm run dev

# Start Ollama only if nothing is listening on the API port (avoids duplicate servers).
run-ollama:
	@command -v ollama >/dev/null || { echo "ollama: not found. Install from https://ollama.com" >&2; exit 1; }
	@curl -sf "$(OLLAMA_URL)/api/tags" >/dev/null 2>&1 && { echo "Ollama already running at $(OLLAMA_URL)"; exit 0; }; \
	echo "Starting Ollama (ollama serve) in the background..."; \
	ollama serve & \
	sleep 2; \
	curl -sf "$(OLLAMA_URL)/api/tags" >/dev/null 2>&1 || { echo "Ollama did not become ready. Run: ollama serve" >&2; exit 1; }; \
	echo "Ollama is up."

dev: install-backend install-frontend run-ollama
	@echo "Starting backend (:8000) and frontend (:3000)..."
	@$(MAKE) -j2 run-backend run-frontend

eval:
	@python3 eval/run_eval.py

clean:
	@rm -rf $(VENV_DIR)
	@rm -rf frontend/node_modules frontend/.next frontend/package-lock.json
