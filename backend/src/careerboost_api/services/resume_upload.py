"""Resume upload validation service."""

from dataclasses import dataclass
from io import BytesIO
from pathlib import PurePath

from pypdf import PdfReader
from pypdf.errors import PdfReadError


class ResumeUploadValidationError(ValueError):
    """Raised when a resume upload fails validation."""


@dataclass(frozen=True)
class ValidatedResumeUpload:
    """Validated resume upload metadata."""

    filename: str
    content_type: str
    size_bytes: int


class ResumeUploadValidator:
    """Validate uploaded resume files before analysis begins."""

    allowed_content_type = "application/pdf"

    def __init__(self, max_file_size_bytes: int) -> None:
        self.max_file_size_bytes = max_file_size_bytes

    def validate(
        self,
        *,
        filename: str | None,
        content_type: str | None,
        content: bytes,
    ) -> ValidatedResumeUpload:
        safe_filename = self._validate_filename(filename)
        safe_content_type = self._validate_content_type(content_type)
        self._validate_size(content)
        self._validate_pdf_content(content)

        return ValidatedResumeUpload(
            filename=safe_filename,
            content_type=safe_content_type,
            size_bytes=len(content),
        )

    def _validate_filename(self, filename: str | None) -> str:
        if not filename:
            raise ResumeUploadValidationError("Resume filename is required.")

        safe_filename = PurePath(filename).name

        if not safe_filename.lower().endswith(".pdf"):
            raise ResumeUploadValidationError("Resume must use a .pdf file extension.")

        return safe_filename

    def _validate_content_type(self, content_type: str | None) -> str:
        if content_type != self.allowed_content_type:
            raise ResumeUploadValidationError("Resume must be uploaded as a PDF file.")

        return content_type

    def _validate_size(self, content: bytes) -> None:
        if len(content) == 0:
            raise ResumeUploadValidationError("Resume file cannot be empty.")

        if len(content) > self.max_file_size_bytes:
            raise ResumeUploadValidationError("Resume file must be 5 MB or smaller.")

    def _validate_pdf_content(self, content: bytes) -> None:
        if not content.startswith(b"%PDF"):
            raise ResumeUploadValidationError("Resume file is not a valid PDF.")

        try:
            reader = PdfReader(BytesIO(content))
        except PdfReadError as exc:
            raise ResumeUploadValidationError("Resume file could not be read as a PDF.") from exc

        if reader.is_encrypted:
            raise ResumeUploadValidationError("Password-protected PDFs are not supported.")
