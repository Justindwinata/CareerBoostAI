"""Deterministic resume text normalization and section detection."""

import re
from dataclasses import dataclass

from careerboost_api.domain import (
    DetectedResumeSection,
    ExtractionQualityWarning,
    ResumeSectionName,
)

SECTION_HEADINGS: dict[str, ResumeSectionName] = {
    "career summary": "summary",
    "objective": "summary",
    "professional summary": "summary",
    "profile": "summary",
    "profil": "summary",
    "ringkasan": "summary",
    "summary": "summary",
    "tentang saya": "summary",
    "core competencies": "skills",
    "keahlian": "skills",
    "kemampuan utama": "skills",
    "keterampilan": "skills",
    "skill": "skills",
    "skills": "skills",
    "technical skills": "skills",
    "employment history": "experience",
    "experience": "experience",
    "pengalaman": "experience",
    "pengalaman kerja": "experience",
    "professional experience": "experience",
    "riwayat pekerjaan": "experience",
    "work experience": "experience",
    "education": "education",
    "academic background": "education",
    "pendidikan": "education",
    "riwayat pendidikan": "education",
    "certifications": "certifications",
    "lisensi dan sertifikasi": "certifications",
    "licenses and certifications": "certifications",
    "sertifikasi": "certifications",
    "portfolio": "projects",
    "portofolio": "projects",
    "project": "projects",
    "project experience": "projects",
    "projects": "projects",
    "proyek": "projects",
    "awards": "awards",
    "penghargaan": "awards",
    "organisasi": "organizations",
    "organizations": "organizations",
}

SECTION_ORDER: dict[ResumeSectionName, int] = {
    "summary": 1,
    "skills": 2,
    "experience": 3,
    "education": 4,
    "projects": 5,
    "certifications": 6,
    "organizations": 7,
    "awards": 8,
}

UNUSUAL_ORDER_WARNING = (
    "Some resume sections may have been extracted in an unusual order. Consider using a simpler "
    "single-column ATS-friendly layout if the analysis looks incomplete."
)

SHORT_CONTENT_WARNING = (
    "Some detected resume headings contain very little extracted text. Review the analysis for "
    "completeness if the original PDF uses columns, tables, or heavy visual layout."
)


@dataclass(frozen=True)
class ResumeTextProcessingResult:
    """Prepared resume text used by future deterministic and AI analysis stages."""

    normalized_text: str
    sections: list[DetectedResumeSection]
    quality_warnings: list[ExtractionQualityWarning]


class ResumeTextProcessor:
    """Normalize extracted resume text and detect obvious resume sections."""

    def process(self, extracted_text: str) -> ResumeTextProcessingResult:
        normalized_text = self.normalize(extracted_text)

        return ResumeTextProcessingResult(
            normalized_text=normalized_text,
            sections=self.detect_sections(normalized_text),
            quality_warnings=self.detect_quality_warnings(normalized_text),
        )

    def normalize(self, extracted_text: str) -> str:
        text = extracted_text.replace("\r\n", "\n").replace("\r", "\n")
        text = text.replace("\u00a0", " ")

        normalized_lines = []
        previous_blank = False

        for raw_line in text.split("\n"):
            line = re.sub(r"[ \t]+", " ", raw_line).strip()

            if not line:
                if normalized_lines and not previous_blank:
                    normalized_lines.append("")
                previous_blank = True
                continue

            normalized_lines.append(line)
            previous_blank = False

        return "\n".join(normalized_lines).strip()

    def detect_sections(self, normalized_text: str) -> list[DetectedResumeSection]:
        lines = normalized_text.splitlines()
        heading_matches = [
            (index, section_name, line)
            for index, line in enumerate(lines)
            if (section_name := self._match_heading(line)) is not None
        ]

        sections: list[DetectedResumeSection] = []

        for match_index, (line_index, section_name, heading) in enumerate(heading_matches):
            next_line_index = (
                heading_matches[match_index + 1][0]
                if match_index + 1 < len(heading_matches)
                else len(lines)
            )
            content_lines = lines[line_index + 1 : next_line_index]
            section_end_line = max(line_index + 1, next_line_index)

            sections.append(
                DetectedResumeSection(
                    name=section_name,
                    heading=heading.rstrip(":"),
                    start_line=line_index + 1,
                    end_line=section_end_line,
                    content="\n".join(line for line in content_lines).strip(),
                )
            )

        return sections

    def detect_quality_warnings(self, normalized_text: str) -> list[ExtractionQualityWarning]:
        sections = self.detect_sections(normalized_text)
        warnings: list[ExtractionQualityWarning] = []

        if self._has_unusual_section_order(sections) or self._has_candidate_name_after_sections(
            normalized_text,
            sections,
        ):
            warnings.append(
                ExtractionQualityWarning(
                    category="unusual_section_order",
                    message=UNUSUAL_ORDER_WARNING,
                )
            )

        if self._has_short_expected_section_content(sections):
            warnings.append(
                ExtractionQualityWarning(
                    category="short_section_content",
                    message=SHORT_CONTENT_WARNING,
                )
            )

        return warnings

    def _match_heading(self, line: str) -> ResumeSectionName | None:
        normalized_heading = line.strip().rstrip(":").lower()
        normalized_heading = re.sub(r"\s+", " ", normalized_heading)

        return SECTION_HEADINGS.get(normalized_heading)

    def _has_unusual_section_order(self, sections: list[DetectedResumeSection]) -> bool:
        section_order = [SECTION_ORDER[section.name] for section in sections]

        return any(
            current_order < previous_order
            for previous_order, current_order in zip(section_order, section_order[1:], strict=False)
        )

    def _has_candidate_name_after_sections(
        self,
        normalized_text: str,
        sections: list[DetectedResumeSection],
    ) -> bool:
        if not sections or sections[0].start_line > 1:
            return False

        heading_lines = {section.start_line for section in sections}

        for line_number, line in enumerate(normalized_text.splitlines(), start=1):
            if line_number in heading_lines:
                continue
            if line_number <= sections[0].start_line:
                continue
            if self._looks_like_candidate_name(line):
                return True

        return False

    def _looks_like_candidate_name(self, line: str) -> bool:
        normalized_line = line.strip()
        if not normalized_line or len(normalized_line) > 80:
            return False
        if any(character.isdigit() for character in normalized_line):
            return False
        if any(marker in normalized_line for marker in ("@", "http", "www", "|", ":")):
            return False
        if self._match_heading(normalized_line) is not None:
            return False

        words = normalized_line.split()
        if not 2 <= len(words) <= 4:
            return False

        return all(
            word[0].isupper() and re.fullmatch(r"[A-Za-zÀ-ÖØ-öø-ÿ.'-]+", word) for word in words
        )

    def _has_short_expected_section_content(self, sections: list[DetectedResumeSection]) -> bool:
        expected_sections = {"summary", "skills", "experience", "education", "projects"}

        return any(
            section.name in expected_sections
            and section.content
            and len(section.content.split()) < 3
            for section in sections
        )
