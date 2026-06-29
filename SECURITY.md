# Security Policy

CareerBoost AI handles resume files and AI-assisted analysis. Resumes may
contain personal information such as names, emails, phone numbers, education,
employment history, and project details. Security and privacy issues are treated
as high priority.

## Supported Versions

Security updates are provided for the active development line until Version 1.0
is released. After Version 1.0, the latest minor release receives security fixes.

| Version | Supported |
| --- | --- |
| Unreleased | Yes |
| 0.x | Yes during active development |
| 1.x | Yes after public release |

## Reporting a Vulnerability

Do not open a public issue for security vulnerabilities.

Report vulnerabilities privately to the repository maintainer with:

- A clear description of the issue.
- Steps to reproduce.
- Impact assessment.
- Affected files, routes, commands, or configuration.
- Suggested mitigation if known.

The maintainer should acknowledge the report within 7 days, investigate the
issue, and coordinate a fix before public disclosure when appropriate.

## Security Expectations

- Never commit API keys, tokens, credentials, or private certificates.
- Never commit real resumes or logs containing personal data.
- Validate uploaded files on the backend.
- Enforce file size and content type limits.
- Do not expose stack traces or internal exception details to users.
- Keep AI provider credentials server-side only.
- Use environment variables for runtime configuration.

## Out of Scope for Security Reports

- Vulnerabilities requiring physical access to a developer machine.
- Social engineering attacks.
- Issues in unsupported forks or modified deployments.
- Missing enterprise features that are not part of Version 1.0 scope.
