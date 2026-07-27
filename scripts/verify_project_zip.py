"""Verify a clean source-only project ZIP archive."""

from __future__ import annotations

import fnmatch
import zipfile
from dataclasses import dataclass
from pathlib import Path


DIST_DIR_NAME = "dist"
MANIFEST_NAME = "PROJECT_ZIP_MANIFEST.md"

FORBIDDEN_FOLDER_PREFIXES = (
    ".git/",
    ".venv/",
    "venv/",
    "env/",
    "ENV/",
    "node_modules/",
    "build/",
    "out/",
    "target/",
    ".gradle/",
    "__pycache__/",
    ".cache/",
    ".pytest_cache/",
    ".mypy_cache/",
    ".ruff_cache/",
    ".idea/",
    ".vscode/",
    "coverage/",
    "htmlcov/",
)

FORBIDDEN_ARCHIVE_PATTERNS = (
    "*.zip",
    "*.tar",
    "*.tar.gz",
    "*.7z",
    "*.rar",
)

FORBIDDEN_MODEL_PATTERNS = (
    "adapter_model.safetensors",
    "*.safetensors",
    "*.bin",
    "*.pt",
    "*.pth",
    "*.onnx",
    "*.gguf",
    "*.ckpt",
    "*.h5",
    "*.keras",
)

FORBIDDEN_LOCAL_ARTIFACT_PATTERNS = (
    ".coverage",
    ".coverage.*",
    "*.db",
    "*.sqlite",
    "*.sqlite.db",
    "*.sqlite3",
    "*.sqlite3-*",
)

IMPORTANT_FILE_CANDIDATES = (
    "README.md",
    "CHANGELOG.md",
    "LICENSE",
    ".env.example",
)

IMPORTANT_SOURCE_BOUNDARIES = (
    "src/",
    "app/",
    "backend/",
    "frontend/",
)


@dataclass(frozen=True)
class VerificationResult:
    """Result summary for ZIP verification."""

    passed: bool
    zip_path: Path
    file_count: int
    failures: list[str]
    warnings: list[str]


def find_project_zip(project_root: Path) -> Path:
    """Locate the expected source archive for the current project."""
    project_name = project_root.name
    zip_path = project_root / DIST_DIR_NAME / f"{project_name}_Project_Source.zip"
    if not zip_path.exists():
        raise FileNotFoundError(f"Expected ZIP not found: {zip_path}")
    return zip_path


def project_has_any(project_root: Path, candidates: tuple[str, ...]) -> list[str]:
    """Return project candidate paths that exist."""
    existing: list[str] = []
    for candidate in candidates:
        candidate_path = project_root / candidate
        if candidate.endswith("/"):
            if candidate_path.is_dir():
                existing.append(candidate)
        elif candidate_path.exists():
            existing.append(candidate)
    return existing


def matches_any_pattern(path: str, patterns: tuple[str, ...]) -> bool:
    """Return whether a POSIX ZIP path matches any pattern."""
    return any(fnmatch.fnmatch(path, pattern) for pattern in patterns)


def contains_forbidden_folder(path: str) -> str | None:
    """Return matched forbidden folder prefix when present."""
    for prefix in FORBIDDEN_FOLDER_PREFIXES:
        if path == prefix.rstrip("/") or path.startswith(prefix) or f"/{prefix}" in path:
            return prefix
    return None


def verify_zip(project_root: Path) -> VerificationResult:
    """Verify the generated source archive."""
    zip_path = find_project_zip(project_root)
    failures: list[str] = []
    warnings: list[str] = []

    with zipfile.ZipFile(zip_path) as archive:
        names = archive.namelist()
        name_set = set(names)

        if MANIFEST_NAME not in name_set:
            failures.append(f"Missing {MANIFEST_NAME}")

        for name in names:
            forbidden_folder = contains_forbidden_folder(name)
            if forbidden_folder:
                failures.append(f"Forbidden folder included: {name} matched {forbidden_folder}")

            if matches_any_pattern(Path(name).name, FORBIDDEN_ARCHIVE_PATTERNS):
                failures.append(f"Nested archive included: {name}")

            if matches_any_pattern(Path(name).name, FORBIDDEN_MODEL_PATTERNS):
                failures.append(f"Large model/checkpoint artifact included: {name}")

            if matches_any_pattern(Path(name).name, FORBIDDEN_LOCAL_ARTIFACT_PATTERNS):
                failures.append(f"Local runtime artifact included: {name}")

        for important_file in project_has_any(project_root, IMPORTANT_FILE_CANDIDATES):
            if important_file not in name_set:
                failures.append(f"Important file missing from ZIP: {important_file}")

        source_boundaries = project_has_any(project_root, IMPORTANT_SOURCE_BOUNDARIES)
        if source_boundaries and not any(
            any(name.startswith(boundary) for name in names) for boundary in source_boundaries
        ):
            failures.append(
                "ZIP does not contain an expected source boundary: "
                + ", ".join(source_boundaries)
            )

        if "docs/" in source_boundaries:
            warnings.append("docs/ is treated as source documentation and should be included.")

        if project_has_any(project_root, ("docs/",)) and not any(
            name.startswith("docs/") for name in names
        ):
            failures.append("Project has docs/ but ZIP does not include docs/")

    return VerificationResult(
        passed=not failures,
        zip_path=zip_path,
        file_count=len(names),
        failures=failures,
        warnings=warnings,
    )


def print_result(result: VerificationResult) -> None:
    """Print a human-readable verification result."""
    status = "PASS" if result.passed else "FAIL"
    print(f"Verification result: {status}")
    print(f"ZIP path: {result.zip_path}")
    print(f"File count: {result.file_count}")

    if result.failures:
        print("Failures:")
        for failure in result.failures:
            print(f"- {failure}")
    else:
        print("Failures: none")

    if result.warnings:
        print("Warnings:")
        for warning in result.warnings:
            print(f"- {warning}")
    else:
        print("Warnings: none")


def main() -> int:
    """Run ZIP verification."""
    project_root = Path.cwd().resolve()
    try:
        result = verify_zip(project_root)
    except FileNotFoundError as exc:
        print("Verification result: FAIL")
        print(str(exc))
        return 1

    print_result(result)
    return 0 if result.passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
