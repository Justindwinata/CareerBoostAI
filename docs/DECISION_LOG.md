# CareerBoost AI Decision Log

## Status

Canonical record of important product, architecture, and delivery decisions already made.

## Decisions

| ID | Decision | Rationale | Tradeoff |
| --- | --- | --- | --- |
| ADR-001 | Use React, Vite, and TypeScript for frontend | Strong portfolio signal, modern tooling, typed UI contracts | Requires frontend build and lint discipline |
| ADR-002 | Use FastAPI for backend | Fits Python AI workflows, validation, and concise APIs | Architecture boundaries must be enforced by project structure |
| ADR-003 | Use PostgreSQL for Version 1.0 persistence | Production-grade relational storage and recruiter credibility | More setup than SQLite |
| ADR-004 | Use modular monolith architecture | Realistic for one developer and still maintainable | Requires discipline to avoid mixed concerns |
| ADR-005 | Use Clean Architecture boundaries | Keeps domain/application rules testable and framework-independent | More upfront structure than flat route handlers |
| ADR-006 | PDF-only resume upload for Version 1.0 | Controls parsing complexity and supports common resume format | DOCX and image-only resumes are deferred |
| ADR-007 | Keep AI provider behind backend infrastructure boundary | Protects secrets and allows provider replacement | Requires structured internal contracts before AI integration |
| ADR-008 | Use MIT license | Maximizes openness, legal clarity, and portfolio usability | Does not include Apache-style patent language |
| ADR-009 | Use GitHub Actions for CI | Validates backend and frontend quality on push and pull request | CI depends on GitHub-hosted runner availability |
| ADR-010 | Add Dependabot | Keeps dependencies visible and maintainable | Requires review discipline for update PRs |
| ADR-011 | Add pre-commit local hooks | Catches quality issues before commit | Requires local setup with `.venv` and `backend/.venv` |
| ADR-012 | Add coverage reporting without external SaaS | Improves quality visibility without accounts or tokens | No hosted coverage badge yet |
| ADR-013 | Block Docker work until runtime exists | Prevents unvalidated infrastructure artifacts | Delays Docker Compose deliverable |
| ADR-014 | Complete resume intake before analysis features | Establishes validated upload, extraction, normalization, section detection, and completeness metadata before ATS, AI, recommendations, or persistence | Sprint 2 produces preparation metadata, not final internship readiness analysis |
| ADR-015 | Implement deterministic ATS feedback metadata before ATS scoring | Allows observable resume signals to be surfaced safely while preserving the approved boundary against readiness claims | Users see non-scored metadata before full ATS scoring exists |
| ADR-016 | Extract deterministic skill signals from explicit mentions only | Prevents guessed or inferred candidate abilities while creating a reusable foundation for future analysis | Skill metadata is limited to controlled terms present in resume text |
| ADR-017 | Represent internship role matching as metadata, not recommendations | Allows role candidates to be displayed from deterministic rules without ranking, suitability claims, or hiring advice | The UI can show role metadata but cannot tell users what role they should pursue |
| ADR-018 | Prioritize accessible dashboard UX before adding new analysis logic | Makes the current deterministic workflow usable and recruiter-demo-ready before expanding product intelligence | Sprint 4 improves presentation without adding scoring, AI, or recommendations |
| ADR-019 | Commit only verified demo assets generated from the running app | Ensures repository visuals are honest, reproducible, and portfolio-safe | Requires maintaining a fictional demo resume and regeneration documentation |
| ADR-020 | Use local SQLite for Sprint 5 saved-analysis history | Enables functional History and Result workflows without unblocking Docker or requiring external services | This is local demo persistence, not authenticated production multi-user storage |
| ADR-021 | Generate standalone HTML reports from stored canonical responses | Provides a portfolio-ready export workflow without adding PDF tooling, cloud storage, or frontend-side report fabrication | HTML reports must be escaped, static, and limited to deterministic metadata |
| ADR-022 | Generate improvement guidance only from deterministic evidence | Gives users actionable resume improvement opportunities while avoiding AI claims, scoring, ranking, or hiring predictions | Guidance is bounded to observed metadata and may miss issues that require human or AI interpretation |
| ADR-023 | Treat API contracts as local release-readiness documentation | Makes frontend-backend behavior reviewable before production API stabilization | Contracts describe current local behavior and must not be oversold as a public production API |

## Blocked Backlog Notes

Docker-related contracts are blocked, not failed:

- EC-0105 Docker Compose Development Stack.
- EC-0106 Dockerfiles.
- EC-0107 Docker Development Workflow.

The blocker is environmental: no compatible Docker runtime is available in the current workspace. Docker artifacts must not be created until `docker` and `docker compose` can be validated locally or in CI.

## Scope Decisions

Version 1.0 excludes:

- Authentication providers.
- Payments and subscriptions.
- Chat systems.
- Messaging.
- Notifications.
- Social networking.
- Admin dashboards.
- Live job listings.

These exclusions keep the project focused on internship readiness analysis and make the 30-day build path realistic.

## Deterministic Analysis Boundary

CareerBoost AI currently implements a deterministic resume intake and metadata pipeline. The system can validate a PDF resume, extract text, normalize text, detect basic sections, compute a completeness baseline, generate non-scored ATS feedback issues, extract explicit skill signals, map deterministic internship role metadata, and display the result in an accessible dashboard.

The implemented deterministic analysis metadata includes:

- Intake and extraction status.
- Extraction confidence metadata.
- Normalized text and detected sections.
- Section completeness baseline.
- ATS feedback metadata with stable issue categories and a `not_scored` score placeholder.
- Explicit skill signal metadata based only on observed resume text.
- Internship role matching metadata based on deterministic rules.
- Responsive dashboard, processing state, structured error recovery, and verified demo screenshots.

The current ATS metadata is not an ATS score, not a pass/fail evaluation, and not an internship readiness judgment. The current role matching metadata is not a ranked recommendation engine. Skill signals are not inferred ability assessments.

The following analysis capabilities remain intentionally out of scope until later contracts:

- ATS scoring.
- AI or LLM integration.
- Inferred skill assessment.
- Ranked role recommendations.
- AI-generated recommendations.
- Production multi-user persistence.
- PDF report export.

This boundary prevents the UI or backend from overstating the current product state. Completeness and detected-section metadata are preparation signals only, not readiness judgments.

## Sprint 4 Product Experience Boundary

Sprint 4 completed the user-facing dashboard experience around the deterministic pipeline:

- Recruiter-demo-ready analysis dashboard.
- Accessible processing experience.
- Structured upload error recovery.
- Accessibility remediation pass.
- Visual consistency and responsive polish.
- Verified desktop screenshots.
- Verified mobile screenshots.
- Fictional reproducible demo resume.
- README Product Preview.
- Demo asset documentation.

Sprint 4 did not add new backend analysis rules, scoring, AI, recommendations, persistence, or Docker artifacts.

## Decision Update Rule

When a future Engineering Contract changes product scope, architecture, validation policy, or blocked backlog status, update this decision log in the same commit as the relevant documentation change.
