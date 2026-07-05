# CareerBoost AI

CareerBoost AI is an internship readiness platform for university students and fresh graduates. The current implementation provides a routed frontend shell, deterministic resume intake, target criteria configuration, evidence-backed target alignment metadata, deterministic improvement guidance, local backend analysis persistence, a functional History page for saved analyses, saved result detail pages, downloadable standalone HTML reports, and analysis metadata; future releases are planned to add AI-assisted guidance, scoring, and additional export formats after explicit contracts are designed and validated.

This repository is being built as a production-quality engineering portfolio project. The goal is not to ship a quick demo, but to demonstrate architecture, product thinking, maintainability, documentation, and disciplined software delivery.

## Why CareerBoost AI Exists

Students often apply to internships without knowing whether their resume is ATS-friendly, whether their technical skills match the roles they want, or what they should improve next. Generic resume scanners usually provide shallow scores, while job boards rarely explain readiness gaps.

CareerBoost AI focuses on one core outcome: helping early-career candidates understand where they stand and what action to take next.

## Product Preview

The screenshots below are verified captures from the running local application using the fictional demo resume in [assets/demo/careerboost-demo-resume.pdf](assets/demo/careerboost-demo-resume.pdf). They reflect the current Sprint 5 product flow: target criteria, deterministic target alignment, improvement guidance, saved analysis history, result detail, and standalone HTML report download. AI scoring, AI-generated recommendations, hiring prediction, and PDF export are not implemented.

### Home

![CareerBoost AI home page](assets/screenshots/home-desktop.png)

### Upload CV with Target Criteria

![CareerBoost AI upload page with target criteria](assets/screenshots/upload-target-criteria-desktop.png)

### Analysis Dashboard

![CareerBoost AI dashboard with target alignment and improvement guidance](assets/screenshots/dashboard-improvement-guidance-desktop.png)

### Saved History and Result Detail

| Saved History | Result Detail |
| --- | --- |
| ![CareerBoost AI saved analysis history](assets/screenshots/history-desktop.png) | ![CareerBoost AI saved result detail](assets/screenshots/result-detail-desktop.png) |

### Standalone HTML Report

![CareerBoost AI standalone HTML report preview](assets/screenshots/html-report-preview-desktop.png)

Responsive captures are maintained in [assets/screenshots](assets/screenshots) and documented in [docs/DEMO_ASSETS.md](docs/DEMO_ASSETS.md).

## Implemented Capabilities and Planned Version 1.0 Work

- Implemented: resume PDF upload with validation and safe failure handling.
- Implemented: resume text extraction with confidence-aware processing.
- Implemented: deterministic ATS metadata without scoring.
- Implemented: explicit skill signal extraction from observed resume text.
- Implemented: deterministic internship role metadata without ranking.
- Implemented: target criteria capture and deterministic target alignment metadata.
- Implemented: deterministic improvement guidance from existing evidence.
- Implemented: analysis dashboard, local history, saved result pages, and standalone HTML report downloads.
- Planned: numeric scoring, AI integration, OCR, production persistence, deployment, and additional export formats after explicit contracts are designed and validated.

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | React, Vite, TypeScript |
| Backend | FastAPI, Python |
| Current local persistence | SQLite via Python standard library |
| Planned production database boundary | PostgreSQL |
| Containerization | Docker, blocked until runtime validation is available |
| Local orchestration | Docker Compose, blocked until runtime validation is available |
| Version control | Git |

## High-Level Architecture Overview

CareerBoost AI will use a modular monolith architecture with Clean Architecture boundaries. The system is intentionally designed to be realistic for a single developer to build while still demonstrating professional separation of concerns.

```mermaid
flowchart LR
  User[Student or Fresh Graduate]
  Frontend[React + TypeScript Frontend]
  Backend[FastAPI Backend]
  Parser[Resume Parser]
  Analysis[Analysis Engine]
  AI[Future AI Provider]
  DB[(Local SQLite)]
  FutureDB[(Future PostgreSQL)]

  User --> Frontend
  Frontend --> Backend
  Backend --> Parser
  Backend --> Analysis
  Analysis --> AI
  Backend --> DB
  Backend -. future production boundary .-> FutureDB
  Backend --> Frontend
```

Core architectural direction:

- The frontend presents workflows and results, but does not own business logic.
- The backend owns validation, orchestration, analysis coordination, and persistence.
- Future AI provider integration stays behind a backend infrastructure boundary.
- Local SQLite stores completed analysis history for the current demo workflow.
- PostgreSQL remains the planned production persistence boundary.
- Docker Compose will provide a reproducible local development environment after Docker validation is unblocked.

## Repository Structure

The repository contains the backend, frontend, documentation, and verified demo assets for the current deterministic resume intake workflow.

Current structure:

```text
.
├── assets/       Verified screenshots and fictional demo resume
├── backend/      FastAPI application
├── frontend/     React + Vite + TypeScript application
├── docs/         Product, architecture, roadmap, and engineering documentation
├── .github/      Repository templates and ownership configuration
└── README.md
```

## Development Roadmap

| Milestone | Focus | Status |
| --- | --- | --- |
| Sprint 0 | Repository foundation and governance | Completed |
| Sprint 1 | Backend and frontend engineering foundation | Completed |
| Sprint 1.5 | Repository quality automation and release engineering | Completed |
| Sprint 2 | Resume upload, validation, extraction, and deterministic metadata | Completed |
| Sprint 3 | Deterministic skill signals and internship role metadata | Completed |
| Sprint 4 | Dashboard experience, accessibility, visual polish, and demo assets | Completed |
| Sprint 5 | Product workflow expansion and product intelligence | In progress |

## Current Project Status

CareerBoost AI currently has a deterministic resume intake and analysis metadata workflow.

Completed work:

- Open-source license.
- Git ignore rules for the planned stack.
- Editor formatting configuration.
- Environment variable example.
- Contribution, conduct, security, changelog, ownership, issue, and pull request standards.
- FastAPI backend foundation with health endpoint.
- React, Vite, and TypeScript frontend foundation.
- GitHub Actions CI.
- Dependabot dependency monitoring.
- Pre-commit quality gate.
- Backend and frontend coverage reporting.
- Resume PDF upload validation.
- PDF text extraction with confidence metadata.
- Canonical structured analysis contract.
- Deterministic section detection and completeness baseline.
- Indonesian and mixed Indonesian-English resume heading aliases for common CV sections.
- Advisory extraction-quality warnings when deterministic parsing detects unusual text order.
- Deterministic ATS feedback metadata without scoring.
- Deterministic skill signal metadata.
- Deterministic internship role matching metadata.
- Multi-page frontend shell with Home, Upload CV, History, Result, and not-found routes.
- Target Application Criteria input on Upload CV, captured as validated metadata.
- Deterministic Target Alignment metadata comparing criteria against explicit resume evidence without scoring or hiring prediction.
- Deterministic improvement guidance generated from existing analysis metadata without AI, scoring, ranking, or hiring prediction.
- Local backend SQLite persistence for completed analyses, including history list, detail retrieval, and delete APIs.
- Functional frontend History page listing locally stored analysis summaries with open-result links and delete actions.
- Functional frontend Result page for opening stored analyses without re-uploading.
- Standalone HTML report download generated from stored deterministic analysis metadata.
- Accessible, responsive analysis dashboard.
- Processing state and structured upload error recovery.
- Accessibility remediation and visual consistency polish.
- Verified demo screenshots using fictional resume data.

Not started yet:

- Database schema.
- Docker Compose runtime.
- ATS scoring.
- AI integration.
- OCR for scanned or image-only resumes.
- Inferred skill assessment.
- Ranked role recommendations.
- AI-generated recommendations.
- PDF report export.
- Demo deployment.

Blocked:

- Docker Compose runtime, Dockerfiles, and Docker development workflow are blocked until a compatible Docker runtime is available.

Screenshots are available in [assets/screenshots](assets/screenshots). Demo asset policy and regeneration notes are documented in [docs/DEMO_ASSETS.md](docs/DEMO_ASSETS.md).

## Engineering Principles

- Maintain clean boundaries between presentation, application, domain, and infrastructure concerns.
- Keep business logic out of UI components.
- Keep database access out of route handlers.
- Prefer explicit, readable code over clever abstractions.
- Validate user input defensively.
- Treat resumes as sensitive user data.
- Keep changes small, tested, documented, and reviewable.
- Optimize for maintainability, testability, security, and recruiter-readable engineering quality.

## Getting Started

The repository contains a working backend, frontend, deterministic resume intake workflow, verified demo assets, and documentation. Docker commands remain unavailable until Docker validation is unblocked.

Clone the repository:

```bash
git clone <repository-url>
cd CareerBoost-AI
```

Inspect available repository automation:

```bash
make help
make doctor
```

Install local development dependencies:

```bash
make install
```

Run the standard validation suite:

```bash
make check
```

Run the backend locally:

```bash
backend/.venv/bin/python -m uvicorn careerboost_api.main:app --app-dir backend/src --reload
```

Run the frontend locally:

```bash
npm --prefix frontend run dev
```

Create local runtime configuration when needed:

```bash
cp .env.example .env
```

See [docs/MANUAL_TESTING.md](docs/MANUAL_TESTING.md) for the full demo validation flow and [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md) for endpoint behavior.

Docker setup commands will be added after Docker validation is unblocked.

## Documentation Index

Existing documentation:

- [License](LICENSE)
- [Changelog](CHANGELOG.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)
- [Environment Example](.env.example)
- [API Contracts](docs/API_CONTRACTS.md)
- [Manual Testing Guide](docs/MANUAL_TESTING.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Demo Assets Guide](docs/DEMO_ASSETS.md)
- [Sprint 1 Completion Report](docs/SPRINT_1_COMPLETION_REPORT.md)
- [Sprint 1.5 Completion Report](docs/SPRINT_1_5_COMPLETION_REPORT.md)
- [Sprint 4 Completion Report](docs/SPRINT_4_COMPLETION_REPORT.md)
- [Blocked Backlog](docs/BLOCKED_BACKLOG.md)
- [Product Requirements Document](docs/PRD.md)
- [System Architecture](docs/SYSTEM_ARCHITECTURE.md)
- [Engineering Constitution](docs/ENGINEERING_CONSTITUTION.md)
- [Roadmap](docs/ROADMAP.md)
- [Decision Log](docs/DECISION_LOG.md)

## Versioning Strategy

CareerBoost AI follows Semantic Versioning.

| Version | Meaning |
| --- | --- |
| `v0.0.1` | Repository bootstrap |
| `v0.1.0` | Product and architecture documentation baseline |
| `v0.2.0` | Backend foundation |
| `v0.3.0` | Frontend foundation |
| `v0.4.0` | Resume upload and validation workflow |
| `v0.5.0` | Resume parsing and analysis workflow |
| `v0.6.0` | Deterministic dashboard and verified demo assets |
| `v0.7.0` | Product intelligence foundation |
| `v0.9.0` | Version 1.0 release candidate |
| `v1.0.0` | Complete approved Version 1.0 product scope |

## License

CareerBoost AI is licensed under the [MIT License](LICENSE).

## Author

Justin Dwinata

CareerBoost AI is developed as a flagship software engineering portfolio project focused on production-quality execution, architecture discipline, and practical value for students preparing for internships.
