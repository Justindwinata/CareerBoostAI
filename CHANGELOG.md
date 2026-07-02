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

### Changed

- Established repository standards before application feature development begins.
- Updated root Makefile commands to match the active backend and frontend workspaces.
- Improved dashboard accessibility, focus behavior, live regions, responsive behavior, visual consistency, and metadata presentation.
- Updated README project status and Product Preview to reflect the completed deterministic dashboard experience.

### Security

- Added responsible disclosure policy and default secret-handling expectations.
- Documented demo resume privacy rules to prevent committing real resume data.

## [0.0.1] - 2026-06-30

### Added

- Initial Sprint 0 repository bootstrap for CareerBoost AI.
