SHELL := /bin/zsh

VENV_DIR := .venv
PY := $(VENV_DIR)/bin/python
UVICORN := $(VENV_DIR)/bin/uvicorn

.PHONY: help install-backend run-backend install-frontend run-frontend dev prod build-frontend run-backend-prod run-frontend-prod clean


help:
	@echo "Common targets:"
	@echo "  make install-backend   # create venv + install backend deps"
	@echo "  make run-backend       # start FastAPI on :8000"
	@echo "  make install-frontend  # npm install in frontend/"
	@echo "  make run-frontend      # start Next.js dev server (port 3000)"
	@echo "  make dev               # Run backend + frontend (parallel, dev mode)"
	@echo "  make prod              # install, build frontend, run backend + frontend (production)"
	@echo "  make build-frontend    # production Next.js build (frontend/.next)"
	@echo "  make run-backend-prod  # FastAPI on :8000 (no --reload)"
	@echo "  make run-frontend-prod # next start on :3000 (run build-frontend first)"
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

dev: install-backend install-frontend
	@echo "Starting backend (:8000) and frontend (:3000)..."
	@$(MAKE) -j2 run-backend run-frontend

build-frontend: install-frontend
	@cd frontend && npm run build

run-backend-prod: install-backend
	@$(UVICORN) backend.main:app --host 0.0.0.0 --port 8000

run-frontend-prod:
	@cd frontend && npm run start

prod: install-backend build-frontend
	@echo "Starting backend (:8000) and frontend (:3000, production)..."
	@$(MAKE) -j2 run-backend-prod run-frontend-prod

clean:
	@rm -rf $(VENV_DIR)
	@rm -rf frontend/node_modules frontend/.next frontend/package-lock.json
