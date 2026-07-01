# CareerBoost AI Roadmap

## Status

Canonical delivery roadmap toward Version 1.0.

## Sprint Map

| Sprint | Focus | Status |
| --- | --- | --- |
| Sprint 0 | Repository foundation and governance | Completed |
| Sprint 1 | Backend and frontend engineering foundation | Completed |
| Sprint 1.5 | Repository quality automation and release engineering | Completed |
| Sprint 1.75 | Source-of-truth documentation baseline | Completed |
| Sprint 2 | Resume intake pipeline, deterministic ATS metadata, and neutral result UX | In progress: intake and ATS metadata slice complete through EC-0123 |
| Sprint 3 | Skill extraction, role matching, and recommendation foundations | Planned |
| Sprint 4 | Dashboard, recommendations, history, and release hardening | Planned |

## Major Milestones

| Version | Milestone | Exit Criteria |
| --- | --- | --- |
| `v0.1.0` | Repository and documentation foundation | Governance, README, source-of-truth docs, quality gates |
| `v0.2.0` | Backend foundation | FastAPI app, config, logging, health, tests |
| `v0.3.0` | Frontend foundation | React/Vite app, lint, tests, build, health status |
| `v0.4.0` | Resume upload | Validated PDF upload and user-safe error states |
| `v0.5.0` | Resume intake pipeline | Text extraction, confidence handling, structured analysis contracts, normalization, section detection, completeness metadata, deterministic ATS metadata, neutral result UX |
| `v0.6.0` | Dashboard and history | Results dashboard and previous analysis records |
| `v0.9.0` | Release candidate | Full Version 1.0 scope complete and hardened |
| `v1.0.0` | Public portfolio release | Approved MVP scope complete, documented, validated, and deployable |

## Blocked Items

Docker work is blocked by unavailable runtime validation:

| Contract | Status | Resume Condition |
| --- | --- | --- |
| EC-0105 Docker Compose Development Stack | Blocked | `docker compose version` succeeds |
| EC-0106 Dockerfiles | Blocked | Docker image builds can be validated |
| EC-0107 Docker Development Workflow | Blocked | Compose stack can run and health checks can be verified |

Do not implement Docker artifacts until the blocker is removed.

## Sprint 2 Progress Snapshot

Sprint 2 has completed the resume intake foundation and the first deterministic ATS feedback slice. The current implementation supports:

- PDF-only resume upload with backend validation for file type, file size, invalid PDFs, empty files, and password-protected PDFs.
- User-safe upload and extraction error states.
- PDF text extraction for valid text-based resumes.
- Extraction confidence metadata.
- Canonical structured analysis response contract.
- Backend orchestration service for mapping validated uploads and extraction outcomes into the response contract.
- Deterministic text normalization for extracted text.
- Deterministic resume section detection for `summary`, `skills`, `experience`, `education`, and `projects`.
- Deterministic completeness baseline based only on detected section presence.
- Deterministic ATS feedback domain contract with explicit issue categories and a `not_scored` score placeholder.
- Deterministic ATS feedback service that maps existing extraction, section, and completeness metadata into non-scored feedback issues.
- Neutral upload result UI showing upload metadata, extraction metadata, completeness baseline, detected section details, ATS feedback metadata, and an extracted-text preview toggle.

The current ATS feedback slice is metadata only. It can display feedback status, deterministic issue categories, issue severity labels, and the score placeholder state. It does not calculate or display an ATS score.

Sprint 2 has intentionally not implemented:

- ATS scoring.
- Skill extraction.
- Role matching.
- Recommendations.
- Persistence or analysis history.
- AI integration.
- Docker artifacts.

The current Sprint 2 result is an intake, preparation, and deterministic metadata pipeline, not a completed resume analysis product.

## Release Path to `v1.0.0`

1. Complete source-of-truth documentation.
2. Define API contracts for upload, analysis status, results, and history.
3. Define database design before persistence implementation.
4. Implement resume upload with backend validation and frontend error states. Completed in Sprint 2.
5. Implement PDF parsing with confidence reporting. Completed in Sprint 2.
6. Implement structured intake and preparation boundaries. Completed in Sprint 2.
7. Implement deterministic ATS metadata. Completed in Sprint 2 without scoring.
8. Implement skill extraction, role matching, recommendations, dashboard, and history.
9. Complete security, accessibility, performance, and release hardening.
10. Resume Docker work only after runtime validation is available.
11. Tag `v1.0.0` only after full MVP scope passes validation.

## Version 1.0 Guardrails

- No authentication providers.
- No payments.
- No chat system.
- No live job listings.
- No admin dashboard.
- No social features.
- No unvalidated Docker work.
