# CareerBoost AI Roadmap

## Status

Canonical delivery roadmap toward Version 1.0. This roadmap records completed sprint outcomes, blocked work, and the next planned delivery direction without expanding the approved product scope.

## Sprint Map

| Sprint | Focus | Status |
| --- | --- | --- |
| Sprint 0 | Repository foundation and governance | Completed |
| Sprint 1 | Backend and frontend engineering foundation | Completed |
| Sprint 1.5 | Repository quality automation and release engineering | Completed |
| Sprint 1.75 | Source-of-truth documentation baseline | Completed |
| Sprint 2 | Resume intake pipeline and deterministic ATS metadata | Completed |
| Sprint 3 | Deterministic skill signals and internship role metadata | Completed |
| Sprint 4 | Dashboard experience, accessibility, visual polish, and verified demo assets | Completed |
| Sprint 5 | Product workflow expansion and product intelligence | In progress |

## Major Milestones

| Version | Milestone | Exit Criteria |
| --- | --- | --- |
| `v0.1.0` | Repository and documentation foundation | Governance, README, source-of-truth docs, quality gates |
| `v0.2.0` | Backend foundation | FastAPI app, config, logging, health, tests |
| `v0.3.0` | Frontend foundation | React/Vite app, lint, tests, build, health status |
| `v0.4.0` | Resume upload | Validated PDF upload and user-safe error states |
| `v0.5.0` | Resume intake pipeline | Text extraction, confidence handling, structured analysis contracts, normalization, section detection, completeness metadata, deterministic ATS metadata |
| `v0.6.0` | Deterministic analysis metadata dashboard | Skill signals, role matching metadata, dashboard UX, accessibility, visual polish, verified demo assets |
| `v0.7.0` | Product intelligence foundation | Deterministic recommendation contracts and explainable improvement guidance without AI claims |
| `v0.9.0` | Release candidate | Version 1.0 scope complete enough for release hardening, security review, performance validation, and deployment preparation |
| `v1.0.0` | Public portfolio release | Approved MVP scope complete, documented, validated, and deployable |

## Completed Product Foundation

The current implementation includes:

- Deterministic PDF validation.
- PDF text extraction with confidence metadata.
- Extracted text normalization.
- Resume section detection for `summary`, `skills`, `experience`, `education`, and `projects`.
- Completeness baseline based on detected section presence.
- Deterministic ATS metadata with `not_scored` score placeholder.
- Deterministic skill signals from explicit text mentions only.
- Deterministic internship role matching metadata without ranking or recommendations.
- Deterministic Target Alignment metadata comparing submitted target criteria against explicit resume evidence without scoring.
- Analysis dashboard with upload, processing, error recovery, summary, structure, skill, ATS, and role sections.
- Accessibility remediation for labels, focus management, live regions, navigation, touch targets, and responsive layout.
- Visual consistency pass for professional SaaS-style dashboard presentation.
- Verified desktop and mobile screenshots captured from the running application.
- Fictional reproducible demo resume and demo asset documentation.
- Multi-page frontend application shell with Home, Upload CV, History, Result placeholder, and not-found routes.
- Target Application Criteria input captured as normalized metadata on upload.

## Not Implemented Yet

The current implementation intentionally does not include:

- Numeric ATS scoring.
- AI or LLM integration.
- Inferred skill assessment.
- Ranked role recommendations.
- Personalized learning recommendations.
- Authentication.
- Persistence and analysis history.
- Downloadable standalone HTML reports.
- Production deployment.
- Docker workflow artifacts.

## Blocked Items

Docker work remains blocked by unavailable local runtime validation:

| Contract | Status | Resume Condition |
| --- | --- | --- |
| EC-0105 Docker Compose Development Stack | Blocked | `docker compose version` succeeds |
| EC-0106 Dockerfiles | Blocked | Docker image builds can be validated |
| EC-0107 Docker Development Workflow | Blocked | Compose stack can run and health checks can be verified |

Do not implement Docker artifacts until the blocker is removed.

## Sprint 5 Progress

Sprint 5 is:

```text
Product Workflow Expansion
```

Completed in Sprint 5:

- EC-0137: Deterministic recommendation contract foundation.
- EC-0138: Multi-page frontend application foundation and navigation shell.
- EC-0139: Target Application Criteria input and validated metadata echo.
- EC-0140: Deterministic Target Alignment metadata from explicit resume evidence.

Current route inventory:

| Route | Status | Purpose |
| --- | --- | --- |
| `/` | Implemented foundation | Home dashboard with current deterministic capabilities and recent-activity empty state |
| `/upload` | Implemented | Existing resume upload and deterministic analysis dashboard workflow |
| `/history` | Implemented foundation | Honest empty state until persistence is designed and implemented |
| `/results/:analysisId` | Implemented foundation | Safe unavailable state until persisted result retrieval exists |
| `*` | Implemented | Accessible not-found page |

Remaining Sprint 5 candidate contracts:

- Explainable improvement guidance based on existing deterministic metadata.
- Dependency warning cleanup.
- API contract documentation.
- Security hardening review.
- Performance validation.
- Deployment preparation.
- Docker backlog resumption only after compatible runtime validation is available.

Sprint 5 must not claim AI capability, persistence, report generation, ATS accuracy, scoring, hiring prediction, or recommendation capability unless those capabilities are explicitly designed, implemented, validated, and documented.

## Release Path to `v1.0.0`

1. Maintain source-of-truth documentation with every milestone.
2. Define API contracts for upload, analysis status, results, and future history workflows.
3. Define database design before persistence implementation.
4. Keep deterministic intake, metadata, dashboard, accessibility, and demo assets validated.
5. Add product intelligence only through explicit contracts and user-safe wording.
6. Complete recommendations, persistence, history, security, performance, and deployment preparation.
7. Resume Docker work only after runtime validation is available.
8. Tag `v1.0.0` only after full approved scope passes validation.

## Version 1.0 Guardrails

- No authentication providers until the core analysis workflow is stable.
- No payments.
- No chat system.
- No live job listings.
- No admin dashboard.
- No social features.
- No unvalidated Docker work.
- No unsupported AI, ATS accuracy, readiness, or recommendation claims.
