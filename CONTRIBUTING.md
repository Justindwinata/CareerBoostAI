# Contributing to CareerBoost AI

Thank you for helping improve CareerBoost AI. This project is built as a
production-quality, portfolio-grade software product. Contributions should
preserve maintainability, readability, testability, security, and clear product
scope.

## Product Scope

CareerBoost AI Version 1.0 is an AI-powered internship readiness platform for
students and fresh graduates. Contributions must align with the approved product
requirements and system architecture. New features should not expand scope
without an accepted feature request and design discussion.

## Development Principles

- Keep changes small and reviewable.
- Prefer explicit code over clever abstractions.
- Keep business logic out of frontend components.
- Keep database access out of route handlers.
- Validate user input defensively.
- Never commit secrets, tokens, private resumes, or personal user data.
- Update documentation when behavior, commands, or architecture decisions change.

## Branch Naming

Use descriptive branches:

- `codex/docs-repository-bootstrap`
- `feature/resume-upload`
- `fix/pdf-validation-error`
- `docs/system-architecture`
- `chore/tooling`

## Commit Messages

Use Conventional Commits:

- `feat: add resume upload validation`
- `fix: handle unreadable pdf extraction`
- `docs: update system architecture`
- `test: cover resume parser failures`
- `chore: configure repository tooling`

## Pull Request Expectations

Every pull request should:

- Explain the problem and solution clearly.
- Reference related issues when available.
- Keep scope focused.
- Include validation evidence such as tests, build output, screenshots, or manual verification notes.
- Update documentation when user-facing behavior, architecture, setup, or operations change.
- Avoid unrelated formatting churn.

## Review Standards

Reviewers should prioritize:

- Correctness and edge cases.
- Security and privacy concerns.
- Maintainability and architecture boundaries.
- Test coverage appropriate to risk.
- User experience for failure states.
- Documentation accuracy.

## Local Quality Gates

Before requesting review, run the relevant project checks through `make` when
tooling exists:

- `make format`
- `make lint`
- `make test`
- `make check`

The Makefile is intentionally defensive: commands explain missing frontend or
backend project files until those workspaces are created.

## Security and Privacy

CareerBoost AI processes resumes, which may contain personal information. Do not
commit real resumes, extracted resume text, API keys, production credentials, or
logs containing personal information. Report vulnerabilities through the process
defined in `SECURITY.md`.
