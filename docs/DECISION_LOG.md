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

## Decision Update Rule

When a future Engineering Contract changes product scope, architecture, validation policy, or blocked backlog status, update this decision log in the same commit as the relevant documentation change.
