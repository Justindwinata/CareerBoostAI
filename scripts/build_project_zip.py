"""Build a clean source-only ZIP archive for a project repository.

The script is intentionally reusable across Python, Node, Android, and general
source-code repositories. It copies project files into a temporary staging
directory, excludes local/runtime/generated artifacts, writes a manifest, then
creates a deterministic ZIP archive under dist/.
"""

from __future__ import annotations

import fnmatch
import hashlib
import json
import os
import shutil
import subprocess
import zipfile
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path


DIST_DIR_NAME = "dist"
MANIFEST_NAME = "PROJECT_ZIP_MANIFEST.md"

FORBIDDEN_DIR_NAMES = {
    ".git",
    ".gradle",
    ".idea",
    ".ipynb_checkpoints",
    ".cache",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".venv",
    ".vscode",
    "__pycache__",
    "build",
    "checkpoints",
    "coverage",
    "dist",
    "env",
    "ENV",
    "htmlcov",
    "models",
    "node_modules",
    "out",
    "outputs",
    "target",
    "venv",
}

FORBIDDEN_FILE_NAMES = {
    ".DS_Store",
    ".env",
    ".env.development",
    ".env.local",
    ".env.production",
    "adapter_model.safetensors",
    "local.properties",
    "Thumbs.db",
}

FORBIDDEN_GLOB_PATTERNS = (
    "*.7z",
    "*.aab",
    "*.apk",
    "*.bak",
    "*.bin",
    "*.ckpt",
    "*.class",
    "*.gguf",
    "*.h5",
    "*.iml",
    "*.jar",
    "*.keras",
    "*.log",
    "*.onnx",
    "*.pt",
    "*.pth",
    "*.pyc",
    "*.pyd",
    "*.pyo",
    "*.rar",
    "*.safetensors",
    "*.sqlite",
    "*.sqlite.db",
    "*.sqlite3",
    "*.swp",
    "*.tar",
    "*.tar.gz",
    "*.temp",
    "*.tmp",
    "*.war",
    "*.zip",
    ".coverage",
    ".coverage.*",
)

FORBIDDEN_PATH_PATTERNS = (
    ".github/workflows/*.log",
    "reports/tmp/*",
)

IMPORTANT_FILES = (
    "README.md",
    "CHANGELOG.md",
    "LICENSE",
    ".env.example",
    "requirements.txt",
    "requirements-dev.txt",
    "pyproject.toml",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "docker-compose.yml",
    "Dockerfile",
    "Makefile",
)


@dataclass(frozen=True)
class GitMetadata:
    """Repository metadata written into the generated manifest."""

    commit_hash: str
    branch: str
    remote_url: str


@dataclass(frozen=True)
class CopyResult:
    """Summary of files copied into staging."""

    included_files: list[Path]
    excluded_paths: list[Path]


def run_git_command(project_root: Path, args: list[str]) -> str:
    """Run a git command and return stripped stdout, or Unknown on failure."""
    try:
        completed = subprocess.run(
            ["git", *args],
            cwd=project_root,
            check=True,
            capture_output=True,
            text=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "Unknown"

    output = completed.stdout.strip()
    return output or "Unknown"


def get_git_metadata(project_root: Path) -> GitMetadata:
    """Read current git metadata for the manifest."""
    return GitMetadata(
        commit_hash=run_git_command(project_root, ["rev-parse", "HEAD"]),
        branch=run_git_command(project_root, ["branch", "--show-current"]),
        remote_url=run_git_command(project_root, ["remote", "get-url", "origin"]),
    )


def normalize_path(path: Path) -> str:
    """Return a POSIX-style relative path string."""
    return path.as_posix()


def is_forbidden_path(relative_path: Path, is_dir: bool) -> bool:
    """Return whether a path should be excluded from the source archive."""
    parts = set(relative_path.parts)
    if parts & FORBIDDEN_DIR_NAMES:
        return True

    name = relative_path.name
    if name in FORBIDDEN_FILE_NAMES:
        return True

    normalized = normalize_path(relative_path)
    if any(fnmatch.fnmatch(normalized, pattern) for pattern in FORBIDDEN_PATH_PATTERNS):
        return True

    if not is_dir and any(fnmatch.fnmatch(name, pattern) for pattern in FORBIDDEN_GLOB_PATTERNS):
        return True

    return False


def copy_allowed_files(project_root: Path, staging_root: Path) -> CopyResult:
    """Copy all non-forbidden project files into the staging directory."""
    included_files: list[Path] = []
    excluded_paths: list[Path] = []

    for current_root, dir_names, file_names in os.walk(project_root):
        current_path = Path(current_root)
        relative_current = current_path.relative_to(project_root)

        allowed_dirs: list[str] = []
        for directory_name in sorted(dir_names):
            source_dir = current_path / directory_name
            relative_dir = source_dir.relative_to(project_root)
            if is_forbidden_path(relative_dir, is_dir=True):
                excluded_paths.append(relative_dir)
                continue
            allowed_dirs.append(directory_name)
        dir_names[:] = allowed_dirs

        if relative_current != Path(".") and is_forbidden_path(relative_current, is_dir=True):
            excluded_paths.append(relative_current)
            continue

        for file_name in sorted(file_names):
            source_file = current_path / file_name
            relative_file = source_file.relative_to(project_root)
            if is_forbidden_path(relative_file, is_dir=False):
                excluded_paths.append(relative_file)
                continue

            destination_file = staging_root / relative_file
            destination_file.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source_file, destination_file)
            included_files.append(relative_file)

    return CopyResult(included_files=included_files, excluded_paths=excluded_paths)


def get_top_level_entries(paths: list[Path]) -> list[str]:
    """Return unique top-level entries from a path list."""
    return sorted({path.parts[0] for path in paths if path.parts})


def read_package_scripts(package_json_path: Path) -> dict[str, str]:
    """Read npm scripts from package.json when present."""
    if not package_json_path.exists():
        return {}

    try:
        data = json.loads(package_json_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}

    scripts = data.get("scripts", {})
    if not isinstance(scripts, dict):
        return {}

    return {str(key): str(value) for key, value in scripts.items()}


def detect_run_commands(project_root: Path) -> list[str]:
    """Infer run commands only from actual project files."""
    commands: list[str] = []

    if (project_root / "requirements.txt").exists():
        commands.append("python3 -m pip install -r requirements.txt")
    if (project_root / "backend" / "pyproject.toml").exists():
        commands.append('backend/.venv/bin/python -m pip install -e "backend[dev]"')
        commands.append(
            "backend/.venv/bin/python -m uvicorn "
            "careerboost_api.main:app --app-dir backend/src --reload"
        )
    if (project_root / "frontend" / "package.json").exists():
        scripts = read_package_scripts(project_root / "frontend" / "package.json")
        commands.append("npm --prefix frontend install")
        if "dev" in scripts:
            commands.append("npm --prefix frontend run dev")
    if (project_root / "package.json").exists():
        scripts = read_package_scripts(project_root / "package.json")
        commands.append("npm install")
        if "dev" in scripts:
            commands.append("npm run dev")
    if (project_root / "gradlew").exists():
        commands.append("./gradlew assembleDebug")

    return commands or ["No run command detected from project files."]


def detect_test_commands(project_root: Path) -> list[str]:
    """Infer test commands only from actual project files."""
    commands: list[str] = []

    if (project_root / "Makefile").exists():
        commands.append("make check")
    if (project_root / "backend" / "tests").exists():
        commands.append("backend/.venv/bin/python -m pytest backend")
    if (project_root / "frontend" / "package.json").exists():
        scripts = read_package_scripts(project_root / "frontend" / "package.json")
        if "test" in scripts:
            commands.append("npm --prefix frontend test")
        if "build" in scripts:
            commands.append("npm --prefix frontend run build")
    if (project_root / "package.json").exists():
        scripts = read_package_scripts(project_root / "package.json")
        if "test" in scripts:
            commands.append("npm test")
        if "build" in scripts:
            commands.append("npm run build")
    if (project_root / "gradlew").exists():
        commands.append("./gradlew test")

    return commands or ["No test command detected from project files."]


def format_markdown_list(items: list[str]) -> str:
    """Format items as a Markdown bullet list."""
    if not items:
        return "- None detected."
    return "\n".join(f"- `{item}`" for item in items)


def build_manifest(
    project_root: Path,
    project_name: str,
    zip_name: str,
    copy_result: CopyResult,
) -> str:
    """Build the text content for PROJECT_ZIP_MANIFEST.md."""
    git_metadata = get_git_metadata(project_root)
    included_top_level = get_top_level_entries(copy_result.included_files)
    excluded_top_level = get_top_level_entries(copy_result.excluded_paths)
    important_present = [name for name in IMPORTANT_FILES if (project_root / name).exists()]

    generated_at = datetime.now(UTC).replace(microsecond=0).isoformat()

    return f"""# Project ZIP Manifest

## Archive Metadata

| Field | Value |
| --- | --- |
| Project name | `{project_name}` |
| Generated timestamp | `{generated_at}` |
| Git commit hash | `{git_metadata.commit_hash}` |
| Git branch | `{git_metadata.branch}` |
| Repository remote URL | `{git_metadata.remote_url}` |
| ZIP file name | `{zip_name}` |

## Included Top-Level Folders and Files

{format_markdown_list(included_top_level)}

## Important Project Files Detected

{format_markdown_list(important_present)}

## Excluded Folders and Files Summary

The archive excludes local Git history, dependency folders, virtual environments, build outputs, caches, logs, temporary files, local environment files, previous archives, local databases, and large AI/model artifacts.

Top-level excluded paths detected during packaging:

{format_markdown_list(excluded_top_level)}

## How to Run Project

{format_markdown_list(detect_run_commands(project_root))}

## How to Test Project

{format_markdown_list(detect_test_commands(project_root))}

## Known Local Setup Requirements

- Install Python dependencies before running backend commands.
- Install frontend dependencies before running frontend commands.
- Copy `.env.example` to `.env` only for local development; `.env` is intentionally excluded from this archive.
- Local SQLite databases under `data/` are runtime artifacts and are intentionally excluded when they match ignored database patterns.
- Docker workflow remains unavailable until Docker runtime validation is unblocked for this project.
"""


def create_zip(staging_root: Path, output_zip: Path) -> None:
    """Create a ZIP archive from a staging directory."""
    with zipfile.ZipFile(output_zip, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
        for file_path in sorted(path for path in staging_root.rglob("*") if path.is_file()):
            archive.write(file_path, file_path.relative_to(staging_root).as_posix())


def sha256_file(file_path: Path) -> str:
    """Return SHA256 hash for a file."""
    digest = hashlib.sha256()
    with file_path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def human_size(byte_count: int) -> str:
    """Return a human-readable file size."""
    size = float(byte_count)
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024 or unit == "GB":
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{byte_count} B"


def main() -> int:
    """Build the source-only project ZIP."""
    project_root = Path.cwd().resolve()
    project_name = project_root.name
    dist_root = project_root / DIST_DIR_NAME
    staging_root = dist_root / f".{project_name}_zip_staging"
    zip_name = f"{project_name}_Project_Source.zip"
    output_zip = dist_root / zip_name

    if staging_root.exists():
        shutil.rmtree(staging_root)
    staging_root.mkdir(parents=True)
    dist_root.mkdir(exist_ok=True)

    try:
        copy_result = copy_allowed_files(project_root, staging_root)
        manifest_content = build_manifest(project_root, project_name, zip_name, copy_result)
        (staging_root / MANIFEST_NAME).write_text(manifest_content, encoding="utf-8")

        if output_zip.exists():
            output_zip.unlink()
        create_zip(staging_root, output_zip)
    finally:
        shutil.rmtree(staging_root, ignore_errors=True)

    zip_size = output_zip.stat().st_size
    sha256 = sha256_file(output_zip)
    included_file_count = len(copy_result.included_files) + 1

    print(f"Project name: {project_name}")
    print(f"Output ZIP path: {output_zip}")
    print(f"ZIP size: {human_size(zip_size)}")
    print(f"Included file count: {included_file_count}")
    print("Excluded pattern summary:")
    print(f"- Directory names: {', '.join(sorted(FORBIDDEN_DIR_NAMES))}")
    print(f"- File names: {', '.join(sorted(FORBIDDEN_FILE_NAMES))}")
    print(f"- Glob patterns: {', '.join(FORBIDDEN_GLOB_PATTERNS)}")
    print(f"SHA256: {sha256}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
