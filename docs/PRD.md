# CareerBoost AI Product Requirements Document

## Status

Canonical product scope for Version 1.0.

## Product Vision

CareerBoost AI helps university students and fresh graduates understand internship readiness from their resume and convert that analysis into a practical improvement plan.

The product should give meaningful guidance, not a shallow score. A successful user leaves knowing whether their resume is ATS-friendly, which roles fit their current profile, which skills are missing, and what to improve next.

## Target Users

| User | Profile | Primary Need |
| --- | --- | --- |
| Computer science student | Has coursework projects, limited professional experience, and wants a first internship | Understand whether their resume and skills are internship-ready |
| Fresh graduate | Has academic and personal projects but low interview response rate | Identify resume weaknesses and realistic internship roles |
| Career-switching student | Has mixed business, information systems, QA, or product experience | Discover suitable technical-adjacent internship paths |

## Problem Statement

Students often apply to internships without knowing whether rejection is caused by resume structure, missing keywords, weak project descriptions, insufficient skills, or poor role targeting.

Existing resume tools often optimize for formatting or generic rewriting. Job boards show opportunities but rarely explain readiness gaps. CareerBoost AI focuses on the early-career candidate’s decision: what should I fix and learn before applying?

## MVP Scope

Version 1.0 includes:

- Landing page that clearly explains the product.
- PDF resume upload with defensive validation.
- Resume text extraction with clear failure handling.
- ATS-focused resume feedback.
- Internship readiness score with explanation.
- Skill extraction and skill-gap analysis.
- Internship role recommendations.
- Prioritized resume and learning recommendations.
- Analysis dashboard.
- Analysis history.

## Out of Scope

The following are excluded from Version 1.0:

| Item | Reason |
| --- | --- |
| Authentication providers | Adds product and security complexity before the core workflow is proven |
| Payments and subscriptions | Monetization is not required for the portfolio release |
| Chat interface | Structured analysis is the approved interaction model |
| Live job listings | Requires external job data and broadens scope |
| Admin dashboard | Not needed for a single-user portfolio-grade v1 |
| Notifications | Not required for immediate analysis workflow |
| Social sharing | Not part of internship readiness core value |
| DOCX upload | PDF-only support keeps parsing scope controlled |
| Docker implementation | Blocked until a compatible runtime is available for validation |

## Success Metrics

| Metric | Target |
| --- | --- |
| Upload validation feedback | Invalid files receive clear feedback immediately |
| Maximum resume upload size | 5 MB |
| Typical analysis completion | Under 20 seconds after upload in local/dev conditions |
| Analysis completion rate | At least 85 percent for valid text-based PDFs |
| Recommendation quality | Recommendations must be specific, prioritized, and actionable |
| Accessibility | Core workflow supports keyboard navigation and readable contrast |
| Reliability | Failed parsing or analysis produces a recoverable user-facing state |
| Portfolio quality | Repository demonstrates architecture, validation, documentation, and disciplined commits |

## Product Non-Negotiables

- Do not present AI output as guaranteed hiring truth.
- Do not silently continue when PDF extraction quality is too low.
- Do not expose internal exceptions to users.
- Do not store or log sensitive resume content casually.
- Do not expand Version 1.0 scope without updating this document and the decision log.
