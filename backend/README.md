# CareerBoost AI Backend

This workspace contains the FastAPI backend for CareerBoost AI.

The backend is responsible for API routing, application orchestration, validation, configuration, logging, and future integration boundaries for resume parsing, persistence, and AI analysis.

Business features such as resume analysis, ATS scoring, skill extraction, and AI provider integration are intentionally excluded from the Sprint 1 foundation.

## Local Commands

Install development dependencies from this directory:

```bash
python3 -m pip install -e ".[dev]"
```

Run tests:

```bash
python3 -m pytest
```

Run linting:

```bash
python3 -m ruff check .
```

Run formatting:

```bash
python3 -m ruff format .
```
