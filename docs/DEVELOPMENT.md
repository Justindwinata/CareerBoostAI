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

## Local Persistence

Successful completed analyses are stored in local SQLite at:

```text
data/careerboost_history.sqlite3
```

This path is controlled by `ANALYSIS_HISTORY_DATABASE_PATH`. The database file is ignored by Git and should not be committed. It may contain canonical analysis response JSON, including extracted resume text, so treat local data as sensitive.

## API and Manual Testing

Backend route behavior is documented in:

```text
docs/API_CONTRACTS.md
```

End-to-end manual testing steps are documented in:

```text
docs/MANUAL_TESTING.md
```

Use the fictional demo resume in `assets/demo/careerboost-demo-resume.pdf` for portfolio screenshots and shared demos. Do not commit or share real user resumes.

## Known Test Warning

Backend tests may emit a third-party Starlette/httpx `TestClient` deprecation warning. This is currently non-blocking: the backend tests pass, and the warning does not indicate a CareerBoost AI application failure.

The warning should be cleaned up only through a dedicated dependency-maintenance contract. Resolving it safely may require coordinated FastAPI, Starlette, and httpx compatibility decisions, so dependency upgrades should not be forced during release-readiness documentation work.
