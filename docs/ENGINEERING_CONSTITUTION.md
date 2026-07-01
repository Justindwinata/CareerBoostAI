# CareerBoost AI Engineering Constitution

## Status

Mandatory engineering rules for all future work.

## Architecture Rules

- Preserve Clean Architecture dependency direction.
- Keep business logic out of React components.
- Keep database access out of FastAPI route handlers.
- Keep AI prompts and provider SDK calls inside backend infrastructure boundaries.
- Keep resume parsing isolated from application workflow orchestration.
- Add abstractions only when they reduce real complexity or preserve a boundary.
- Do not introduce microservices for Version 1.0.

## Code Quality Rules

- Prefer explicit readable code over clever code.
- Keep functions focused on one responsibility.
- Avoid giant files and mixed concerns.
- Use typed interfaces and models at system boundaries.
- Validate all user-controlled input defensively.
- Treat resume data as sensitive.
- Do not commit commented-out production code.
- Do not add placeholder implementations.

## Commit Discipline

- One Engineering Contract produces one logical commit.
- Use Conventional Commits.
- Stage only files related to the active contract.
- Run `git status` before staging.
- Review `git diff` before committing.
- Push after every successful contract.
- Never combine unrelated work to save time.

## Validation Discipline

Before commit, run validation appropriate to the changed surface.

Core validation commands:

```bash
make format-check
make lint
make test
make build
```

When quality tooling changes, also run:

```bash
make test-coverage
make pre-commit
make check
```

Do not commit when validation fails. Fix the issue or stop and report the blocker.

## No-Scope-Creep Rules

- Do not implement resume upload before Sprint 2 begins.
- Do not implement ATS scoring before its approved contract.
- Do not implement AI integration before the API contract and validation strategy are approved.
- Do not implement Docker artifacts while Docker runtime validation is blocked.
- Do not add authentication, payments, chat, notifications, or social features to Version 1.0.
- Do not change product scope without updating `docs/PRD.md` and `docs/DECISION_LOG.md`.

## Documentation Rules

- Update documentation when behavior, architecture, workflow, or validation changes.
- Keep source-of-truth documents concise and current.
- Do not duplicate large sections across documents when a reference is enough.
- Sprint reports record outcomes; source-of-truth documents govern future work.

## Security Rules

- Never commit secrets.
- Never print or log private keys.
- Never log full resume content.
- Keep `.env.example` safe and non-secret.
- Use environment variables for runtime configuration.
- Convert internal errors to safe user-facing responses.
