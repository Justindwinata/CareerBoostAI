"""Deterministic resume completeness baseline from detected sections."""

from careerboost_api.domain import (
    DetectedResumeSection,
    ResumeCompletenessContract,
    ResumeSectionName,
)

EXPECTED_RESUME_SECTIONS: tuple[ResumeSectionName, ...] = (
    "summary",
    "skills",
    "experience",
    "education",
    "projects",
)


class ResumeCompletenessCalculator:
    """Calculate section-presence completeness without interpretation or advice."""

    def calculate(
        self,
        sections: list[DetectedResumeSection],
    ) -> ResumeCompletenessContract:
        detected_names = {section.name for section in sections}
        present_sections = [
            section_name
            for section_name in EXPECTED_RESUME_SECTIONS
            if section_name in detected_names
        ]
        missing_sections = [
            section_name
            for section_name in EXPECTED_RESUME_SECTIONS
            if section_name not in detected_names
        ]

        return ResumeCompletenessContract(
            expected_sections=list(EXPECTED_RESUME_SECTIONS),
            present_sections=present_sections,
            missing_sections=missing_sections,
            score=len(present_sections) / len(EXPECTED_RESUME_SECTIONS),
        )
