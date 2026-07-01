"""Deterministic skill signal extraction from normalized resume text."""

import re
from dataclasses import dataclass

from careerboost_api.domain import (
    DetectedResumeSection,
    SkillSignal,
    SkillSignalCategory,
    SkillSignalEvidence,
    SkillSignalsContract,
    SkillSourceArea,
)


@dataclass(frozen=True)
class ControlledSkill:
    """Controlled skill term that can be detected only by explicit mention."""

    name: str
    category: SkillSignalCategory
    aliases: tuple[str, ...]


CONTROLLED_SKILLS: tuple[ControlledSkill, ...] = (
    ControlledSkill("Python", "programming_language", ("python",)),
    ControlledSkill("JavaScript", "programming_language", ("javascript", "js")),
    ControlledSkill("TypeScript", "programming_language", ("typescript", "ts")),
    ControlledSkill("SQL", "programming_language", ("sql",)),
    ControlledSkill("FastAPI", "framework", ("fastapi",)),
    ControlledSkill("React", "framework", ("react", "react.js", "reactjs")),
    ControlledSkill("Node.js", "framework", ("node.js", "nodejs")),
    ControlledSkill("PostgreSQL", "database", ("postgresql", "postgres")),
    ControlledSkill("Git", "tooling", ("git",)),
    ControlledSkill("Docker", "tooling", ("docker",)),
    ControlledSkill("Pytest", "testing", ("pytest",)),
    ControlledSkill("HTML", "web_technology", ("html",)),
    ControlledSkill("CSS", "web_technology", ("css",)),
)


class SkillSignalExtractor:
    """Extract explicit skill mentions without scoring, ranking, or inference."""

    def extract(
        self,
        *,
        normalized_text: str | None,
        sections: list[DetectedResumeSection],
    ) -> SkillSignalsContract:
        if normalized_text is None or not normalized_text.strip():
            return SkillSignalsContract(status="not_evaluated")

        signals = [
            signal
            for skill in CONTROLLED_SKILLS
            if (signal := self._build_signal(skill, normalized_text, sections)) is not None
        ]

        if not signals:
            return SkillSignalsContract(status="no_signals")

        return SkillSignalsContract(status="signals_detected", signals=signals)

    def _build_signal(
        self,
        skill: ControlledSkill,
        normalized_text: str,
        sections: list[DetectedResumeSection],
    ) -> SkillSignal | None:
        evidence: list[SkillSignalEvidence] = []
        seen_lines: set[tuple[int, str]] = set()

        for line_number, line in enumerate(normalized_text.splitlines(), start=1):
            for alias in skill.aliases:
                if not self._contains_explicit_alias(line, alias):
                    continue

                dedupe_key = (line_number, alias)
                if dedupe_key in seen_lines:
                    continue

                seen_lines.add(dedupe_key)
                evidence.append(
                    SkillSignalEvidence(
                        matched_text=alias,
                        source_area=self._resolve_source_area(line_number, sections),
                        line_number=line_number,
                        evidence_text=line,
                    )
                )

        if not evidence:
            return None

        return SkillSignal(
            name=skill.name,
            category=skill.category,
            evidence=evidence,
        )

    def _contains_explicit_alias(self, line: str, alias: str) -> bool:
        escaped_alias = re.escape(alias)
        pattern = rf"(?<![A-Za-z0-9+#]){escaped_alias}(?![A-Za-z0-9+#])"

        return re.search(pattern, line, flags=re.IGNORECASE) is not None

    def _resolve_source_area(
        self,
        line_number: int,
        sections: list[DetectedResumeSection],
    ) -> SkillSourceArea:
        for section in sections:
            if section.start_line <= line_number <= section.end_line:
                return section.name

        return "document"
