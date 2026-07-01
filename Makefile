SHELL := /bin/sh

BACKEND_PYTHON := backend/.venv/bin/python
ROOT_PYTHON := .venv/bin/python
PRE_COMMIT_HOME := .cache/pre-commit

.PHONY: help install install-backend install-frontend install-tools check format format-check lint test test-coverage build pre-commit clean doctor

help:
	@echo "CareerBoost AI repository commands"
	@echo ""
	@echo "Available targets:"
	@echo "  make install        Install backend, frontend, and repository tooling"
	@echo "  make doctor         Check local tool availability"
	@echo "  make format         Format backend and frontend"
	@echo "  make format-check   Check backend and frontend formatting"
	@echo "  make lint           Run backend and frontend linters"
	@echo "  make test           Run backend and frontend tests"
	@echo "  make test-coverage  Run backend and frontend tests with coverage"
	@echo "  make build          Build the frontend"
	@echo "  make pre-commit     Run pre-commit hooks across all files"
	@echo "  make check          Run the standard validation suite"
	@echo "  make clean          Remove local generated caches"

install: install-backend install-frontend install-tools

install-backend:
	python3 -m venv backend/.venv
	$(BACKEND_PYTHON) -m pip install -e "backend[dev]"

install-frontend:
	npm --prefix frontend install

install-tools:
	python3 -m venv .venv
	$(ROOT_PYTHON) -m pip install -r requirements-dev.txt

doctor:
	@echo "Checking local tools..."
	@command -v git >/dev/null 2>&1 && echo "git: available" || echo "git: missing"
	@command -v docker >/dev/null 2>&1 && echo "docker: available" || echo "docker: missing"
	@command -v node >/dev/null 2>&1 && echo "node: available" || echo "node: missing"
	@command -v npm >/dev/null 2>&1 && echo "npm: available" || echo "npm: missing"
	@command -v python3 >/dev/null 2>&1 && echo "python3: available" || echo "python3: missing"

format:
	$(BACKEND_PYTHON) -m ruff format backend
	npm --prefix frontend run format

format-check:
	$(BACKEND_PYTHON) -m ruff format --check backend
	npm --prefix frontend run format:check

lint:
	$(BACKEND_PYTHON) -m ruff check backend
	npm --prefix frontend run lint

test:
	$(BACKEND_PYTHON) -m pytest backend
	npm --prefix frontend test

test-coverage:
	$(BACKEND_PYTHON) -m pytest backend --cov=careerboost_api --cov-report=term-missing
	npm --prefix frontend run test:coverage

build:
	npm --prefix frontend run build

pre-commit:
	PRE_COMMIT_HOME=$(PRE_COMMIT_HOME) $(ROOT_PYTHON) -m pre_commit run --all-files

check: format-check lint test build

clean:
	@find . -type d -name "__pycache__" -prune -exec rm -rf {} +
	@find . -type d -name ".pytest_cache" -prune -exec rm -rf {} +
	@find . -type d -name ".ruff_cache" -prune -exec rm -rf {} +
	@find . -type d -name ".cache" -prune -exec rm -rf {} +
	@find . -type d -name "node_modules" -prune -exec rm -rf {} +
	@find . -type d -name "dist" -prune -exec rm -rf {} +
	@find . -type d -name "coverage" -prune -exec rm -rf {} +
	@find . -type f -name ".coverage" -delete
