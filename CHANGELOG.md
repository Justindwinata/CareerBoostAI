# Changelog

All notable changes to CareerBoost AI will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/) and uses a
human-readable changelog format inspired by [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- Repository governance files for licensing, contribution rules, security reporting, issue templates, pull request review, and local automation.
- Environment configuration example for the planned React, FastAPI, PostgreSQL, and Docker-based development workflow.
- FastAPI backend foundation with application factory, configuration, structured logging, health endpoint, linting, formatting, and tests.
- React, Vite, and TypeScript frontend foundation with linting, formatting, tests, production build, and backend health status integration.
- GitHub Actions CI workflow for backend and frontend validation.
- Dependabot configuration for GitHub Actions, backend Python dependencies, and frontend npm dependencies.
- Pre-commit quality gate using local backend and frontend validation commands.
- Backend and frontend coverage reporting.
- Sprint completion reports, blocked backlog, and development guide.
- Resume PDF upload validation, PDF text extraction, normalization, section detection, and completeness metadata.
- Deterministic ATS metadata with a `not_scored` score placeholder.
- Deterministic skill signal metadata from explicit resume text mentions.
- Deterministic internship role matching metadata without ranking or recommendations.
- Recruiter-demo-ready analysis dashboard with processing feedback and structured upload error recovery.
- Verified desktop and mobile screenshots generated from the running application using a fictional demo resume.
- Demo asset documentation for privacy policy, capture states, viewport sizes, and regeneration.
- Multi-page frontend application shell with Home, Upload CV, History, Result placeholder, and not-found routes.
- Target Application Criteria configuration on Upload CV, submitted as optional validated metadata and echoed in the analysis response.
- Deterministic Target Alignment metadata comparing target criteria against explicit resume evidence without scoring or hiring prediction.
- Local backend analysis history persistence using SQLite, including summary listing, full result retrieval, and delete APIs.
- Functional frontend History page that lists locally saved analysis summaries, links to result routes, refreshes records, and deletes records safely.
- Functional frontend Result page that retrieves stored analysis details and renders the shared analysis dashboard without re-uploading.

### Changed

- Established repository standards before application feature development begins.
- Updated root Makefile commands to match the active backend and frontend workspaces.
- Improved dashboard accessibility, focus behavior, live regions, responsive behavior, visual consistency, and metadata presentation.
- Updated README project status and Product Preview to reflect the completed deterministic dashboard experience.
- Moved the existing upload-analysis experience into the `/upload` route without changing deterministic analysis behavior.
- Extended upload requests with optional `target_criteria` multipart JSON while preserving the no-criteria upload path.
- Extracted the analysis dashboard presentation for reuse across upload results and stored result detail pages.

### Security

- Added responsible disclosure policy and default secret-handling expectations.
- Documented demo resume privacy rules to prevent committing real resume data.

## [0.0.1] - 2026-06-30

### Added

- Initial Sprint 0 repository bootstrap for CareerBoost AI.
