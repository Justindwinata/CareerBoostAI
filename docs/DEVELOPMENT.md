# Development Guide

This guide describes the validated local development workflow for CareerBoost AI.

Docker-based development is intentionally excluded until a compatible runtime is available. See `docs/BLOCKED_BACKLOG.md` for the blocked Docker contracts.

## Prerequisites

- Git
- Python 3.12
- Node.js 24
- npm 11

## Initial Setup

Install all local dependencies from the repository root:

```bash
make install
```

This command creates:

- `backend/.venv` for backend dependencies.
- `.venv` for repository tooling such as pre-commit.
- `frontend/node_modules` for frontend dependencies.

## Daily Validation

Run the standard validation suite:

```bash
make check
```

This executes:

- Backend format check.
- Backend linting.
- Backend tests.
- Frontend format check.
- Frontend linting.
- Frontend tests.
- Frontend production build.

## Coverage

Run coverage reporting:

```bash
make test-coverage
```

Backend coverage is reported in the terminal with an 80 percent minimum threshold. Frontend coverage uses Vitest with text and LCOV reports.

## Pre-Commit

Run all pre-commit hooks manually:

```bash
make pre-commit
```

Install the Git hook after `make install`:

```bash
PRE_COMMIT_HOME=.cache/pre-commit .venv/bin/pre-commit install
```

The hook uses local project commands and does not require external hook repositories.

## Application Commands

Run the backend API locally:

```bash
backend/.venv/bin/python -m uvicorn careerboost_api.main:app --app-dir backend/src --reload
```

Run the frontend locally:

```bash
npm --prefix frontend run dev
```

The frontend expects the backend API at `VITE_API_BASE_URL`, which defaults to `http://localhost:8000`.
