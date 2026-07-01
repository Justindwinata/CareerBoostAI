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
| Sprint 2 | Resume upload and validation workflow | Planned |
| Sprint 3 | Resume parsing and analysis pipeline | Planned |
| Sprint 4 | Dashboard, recommendations, history, and release hardening | Planned |

## Major Milestones

| Version | Milestone | Exit Criteria |
| --- | --- | --- |
| `v0.1.0` | Repository and documentation foundation | Governance, README, source-of-truth docs, quality gates |
| `v0.2.0` | Backend foundation | FastAPI app, config, logging, health, tests |
| `v0.3.0` | Frontend foundation | React/Vite app, lint, tests, build, health status |
| `v0.4.0` | Resume upload | Validated PDF upload and user-safe error states |
| `v0.5.0` | Resume parsing and analysis workflow | Text extraction, confidence handling, structured analysis contracts |
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

## Release Path to `v1.0.0`

1. Complete source-of-truth documentation.
2. Define API contracts for upload, analysis status, results, and history.
3. Define database design before persistence implementation.
4. Implement resume upload with backend validation and frontend error states.
5. Implement PDF parsing with confidence reporting.
6. Implement structured analysis engine boundaries.
7. Implement dashboard, recommendations, and history.
8. Complete security, accessibility, performance, and release hardening.
9. Resume Docker work only after runtime validation is available.
10. Tag `v1.0.0` only after full MVP scope passes validation.

## Version 1.0 Guardrails

- No authentication providers.
- No payments.
- No chat system.
- No live job listings.
- No admin dashboard.
- No social features.
- No unvalidated Docker work.
