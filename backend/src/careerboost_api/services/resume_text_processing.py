"""Deterministic resume text normalization and section detection."""

import re
from dataclasses import dataclass

from careerboost_api.domain import DetectedResumeSection, ResumeSectionName

SECTION_HEADINGS: dict[str, ResumeSectionName] = {
    "career summary": "summary",
    "objective": "summary",
    "professional summary": "summary",
    "profile": "summary",
    "summary": "summary",
    "core competencies": "skills",
    "skills": "skills",
    "technical skills": "skills",
    "employment history": "experience",
    "experience": "experience",
    "professional experience": "experience",
    "work experience": "experience",
    "education": "education",
    "academic background": "education",
    "project experience": "projects",
    "projects": "projects",
}


@dataclass(frozen=True)
class ResumeTextProcessingResult:
    """Prepared resume text used by future deterministic and AI analysis stages."""

    normalized_text: str
    sections: list[DetectedResumeSection]


class ResumeTextProcessor:
    """Normalize extracted resume text and detect obvious resume sections."""

    def process(self, extracted_text: str) -> ResumeTextProcessingResult:
        normalized_text = self.normalize(extracted_text)

        return ResumeTextProcessingResult(
            normalized_text=normalized_text,
            sections=self.detect_sections(normalized_text),
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

    def _match_heading(self, line: str) -> ResumeSectionName | None:
        normalized_heading = line.strip().rstrip(":").lower()
        normalized_heading = re.sub(r"\s+", " ", normalized_heading)

        return SECTION_HEADINGS.get(normalized_heading)
