SHELL := /bin/sh

.PHONY: help check format lint test clean doctor

help:
	@echo "CareerBoost AI repository commands"
	@echo ""
	@echo "Available targets:"
	@echo "  make doctor   Check local tool availability"
	@echo "  make format   Run formatters when project workspaces exist"
	@echo "  make lint     Run linters when project workspaces exist"
	@echo "  make test     Run tests when project workspaces exist"
	@echo "  make check    Run format, lint, and test"
	@echo "  make clean    Remove local generated caches"

doctor:
	@echo "Checking local tools..."
	@command -v git >/dev/null 2>&1 && echo "git: available" || echo "git: missing"
	@command -v docker >/dev/null 2>&1 && echo "docker: available" || echo "docker: missing"
	@command -v node >/dev/null 2>&1 && echo "node: available" || echo "node: missing"
	@command -v python3 >/dev/null 2>&1 && echo "python3: available" || echo "python3: missing"

format:
	@if [ -f frontend/package.json ]; then \
		cd frontend && npm run format; \
	else \
		echo "frontend/package.json not found; skipping frontend formatting"; \
	fi
	@if [ -f backend/pyproject.toml ]; then \
		cd backend && python3 -m ruff format .; \
	else \
		echo "backend/pyproject.toml not found; skipping backend formatting"; \
	fi

lint:
	@if [ -f frontend/package.json ]; then \
		cd frontend && npm run lint; \
	else \
		echo "frontend/package.json not found; skipping frontend linting"; \
	fi
	@if [ -f backend/pyproject.toml ]; then \
		cd backend && python3 -m ruff check .; \
	else \
		echo "backend/pyproject.toml not found; skipping backend linting"; \
	fi

test:
	@if [ -f frontend/package.json ]; then \
		cd frontend && npm test; \
	else \
		echo "frontend/package.json not found; skipping frontend tests"; \
	fi
	@if [ -f backend/pyproject.toml ]; then \
		cd backend && python3 -m pytest; \
	else \
		echo "backend/pyproject.toml not found; skipping backend tests"; \
	fi

check: format lint test

clean:
	@find . -type d -name "__pycache__" -prune -exec rm -rf {} +
	@find . -type d -name ".pytest_cache" -prune -exec rm -rf {} +
	@find . -type d -name ".ruff_cache" -prune -exec rm -rf {} +
	@find . -type d -name "node_modules" -prune -exec rm -rf {} +
	@find . -type d -name "dist" -prune -exec rm -rf {} +
