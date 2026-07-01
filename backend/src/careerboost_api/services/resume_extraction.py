"""Resume PDF text extraction service."""

from dataclasses import dataclass
from io import BytesIO
from typing import Literal

from pypdf import PdfReader
from pypdf.errors import PdfReadError


class ResumeTextExtractionError(ValueError):
    """Raised when resume text cannot be extracted safely."""


ExtractionConfidence = Literal["medium", "high"]


@dataclass(frozen=True)
class ResumeTextExtractionResult:
    """Text extracted from a validated resume PDF."""

    extracted_text: str
    confidence: ExtractionConfidence
    character_count: int
    page_count: int


class ResumeTextExtractor:
    """Extract text from a validated PDF resume."""

    def __init__(self, minimum_text_length: int = 80) -> None:
        self.minimum_text_length = minimum_text_length

    def extract(self, content: bytes) -> ResumeTextExtractionResult:
        try:
            reader = PdfReader(BytesIO(content))
            page_text = [page.extract_text() or "" for page in reader.pages]
        except (PdfReadError, OSError, ValueError) as exc:
            raise ResumeTextExtractionError(
                "Resume text could not be extracted from this PDF."
            ) from exc

        extracted_text = self._normalize_text("\n".join(page_text))
        character_count = len(extracted_text)

        if character_count < self.minimum_text_length:
            raise ResumeTextExtractionError(
                "Resume text is too short to analyze. Upload a text-based PDF resume."
            )

        return ResumeTextExtractionResult(
            extracted_text=extracted_text,
            confidence=self._calculate_confidence(character_count),
            character_count=character_count,
            page_count=len(reader.pages),
        )

    def _normalize_text(self, text: str) -> str:
        return "\n".join(line.strip() for line in text.splitlines() if line.strip())

    def _calculate_confidence(self, character_count: int) -> ExtractionConfidence:
        if character_count >= 600:
            return "high"

        return "medium"
