# Project ZIP Packaging Guide

## Purpose

CareerBoost AI can be packaged into a clean source-only ZIP archive for backup, portfolio submission, or repository review. The archive is designed to let someone reopen, inspect, run, test, and continue development without carrying local machine artifacts.

The generated ZIP is not a release binary and is not intended to replace Git history.

## What Is Included

The packaging script includes project files that are useful for development and review, such as:

- Source code in `backend/` and `frontend/`
- Tests
- Configuration files
- Documentation in `docs/`
- Repository governance files
- `.env.example`
- Package and lock files
- Intentional demo assets in `assets/`
- Packaging scripts in `scripts/`

The ZIP also contains:

```text
PROJECT_ZIP_MANIFEST.md
```

The manifest records project metadata, Git metadata, included top-level entries, excluded artifact summary, run commands, test commands, and local setup notes.

## What Is Excluded

The packaging script excludes local and generated artifacts, including:

- `.git/`
- Virtual environments such as `.venv/`, `venv/`, `env/`, and `ENV/`
- Installed dependencies such as `node_modules/`
- Build outputs such as `dist/`, `build/`, `out/`, and `target/`
- Cache directories such as `__pycache__/`, `.pytest_cache/`, `.ruff_cache/`, and `.mypy_cache/`
- IDE and OS files such as `.idea/`, `.vscode/`, `.DS_Store`, and `Thumbs.db`
- Logs, temporary files, backup files, and previous archives
- Local `.env` files
- Local SQLite databases and runtime artifacts
- Large model or checkpoint artifacts such as `.safetensors`, `.bin`, `.pt`, `.pth`, `.onnx`, `.gguf`, `.ckpt`, `.h5`, and `.keras`

These exclusions keep the ZIP small, portable, privacy-safe, and reviewable. Dependencies and build outputs should be regenerated from committed project files, not archived.

## Generate the ZIP

Run from the repository root:

```bash
python3 scripts/build_project_zip.py
```

The output is written to:

```text
dist/<PROJECT_NAME>_Project_Source.zip
```

For this repository, the project name is detected from the current folder name.

## Verify the ZIP

Run from the repository root:

```bash
python3 scripts/verify_project_zip.py
```

The verifier checks that:

- The expected ZIP exists.
- Forbidden folders are not present.
- Previous ZIP files are not nested inside the archive.
- Large model/checkpoint files are not included.
- `PROJECT_ZIP_MANIFEST.md` exists.
- Important files such as `README.md` are present when they exist in the project.
- Expected source boundaries such as `backend/` and `frontend/` are included.

## Recommended Validation Before Packaging

Run the normal project quality gate first:

```bash
git diff --check
git status --short --branch
make check
make pre-commit
```

Then build and verify the ZIP:

```bash
python3 scripts/build_project_zip.py
python3 scripts/verify_project_zip.py
```

## Local Setup Requirements

CareerBoost AI currently uses:

- Python 3.12
- Node.js 24
- npm 11
- Local backend virtual environment under `backend/.venv`
- Local repository tooling virtual environment under `.venv`
- Frontend dependencies under `frontend/node_modules`

Those local dependency folders are intentionally excluded from the ZIP. Reinstall dependencies from committed project files after extracting the archive.

## Regenerate Later

To regenerate the ZIP later:

1. Pull the latest repository state.
2. Run validation.
3. Run `python3 scripts/build_project_zip.py`.
4. Run `python3 scripts/verify_project_zip.py`.
5. Use the ZIP from `dist/`.

Do not commit the generated ZIP unless a future contract explicitly requires it.
