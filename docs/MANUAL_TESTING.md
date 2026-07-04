# CareerBoost AI Manual Testing Guide

## Status

Practical local smoke-test guide for release-readiness review. Docker is intentionally excluded until the blocked Docker contracts can be validated with a compatible runtime.

## Prerequisites

- Python 3.12
- Node.js 24
- npm 11
- Local dependencies installed with `make install`
- Local configuration copied from `.env.example` when environment overrides are needed

## Start the Application

From the repository root, start the backend API:

```bash
backend/.venv/bin/python -m uvicorn careerboost_api.main:app --app-dir backend/src --reload
```

In a second terminal, start the frontend:

```bash
npm --prefix frontend run dev
```

Default local URLs:

| Application | URL |
| --- | --- |
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:8000` |
| API health check | `http://localhost:8000/health` |

The frontend API base URL is controlled by `VITE_API_BASE_URL` and defaults to `http://localhost:8000`.

## Demo Resume Policy

Use the fictional demo resume at:

```text
assets/demo/careerboost-demo-resume.pdf
```

Do not use private resumes in screenshots, commits, or shared demo artifacts. The local SQLite history database can contain extracted text from uploaded resumes, so treat local data as sensitive.

## Suggested Target Criteria

Use these values to verify target criteria, target alignment, and improvement guidance:

| Field | Example |
| --- | --- |
| Target role | `Frontend Developer Intern` |
| Target description | `Internship role focused on React, TypeScript, accessible UI, API integration, and project evidence.` |
| Required skills | `React`, `TypeScript`, `REST API`, `SQL` |
| Preferred skills | `Docker`, `PostgreSQL`, `Power BI` |
| Required sections | `summary`, `skills`, `projects`, `education`, `certifications` |
| Analysis priorities | `resume_structure`, `skill_visibility`, `role_alignment`, `ats_compatibility` |
| Experience expectation | `Internship level; academic projects acceptable.` |
| Education expectation | `Computer Science or related field preferred.` |
| Notes | `Review only explicit evidence shown in the resume.` |

Expected behavior: the system returns factual deterministic metadata only. It must not show numeric scores, hiring predictions, acceptance guarantees, or AI claims.

## Manual Smoke Test Flow

### 1. Home Page

Open:

```text
http://localhost:5173/
```

Verify:

- Product overview renders.
- Primary navigation is visible.
- Upload CV action points to `/upload`.
- Recent activity does not fabricate saved analyses.

### 2. Upload Without Target Criteria

Open:

```text
http://localhost:5173/upload
```

Verify:

- Target Criteria panel is visible but optional.
- Upload works with `assets/demo/careerboost-demo-resume.pdf` when criteria are empty.
- Processing state appears immediately after submit.
- Duplicate submission is prevented while processing.
- Completed dashboard appears.
- Application Target section states that no target criteria were provided.
- No score, hiring prediction, acceptance guarantee, or AI claim appears.

### 3. Upload With Target Criteria

Repeat the upload with the suggested target criteria.

Verify:

- Target criteria values are accepted and normalized.
- Required and preferred skill lists remove empty entries and duplicates.
- Target Alignment appears after analysis.
- Required skills show found or not-found states based on explicit resume evidence.
- Required sections show detected or missing states based on detected section metadata.
- Improvement Guidance appears when deterministic rules produce evidence-backed items.
- Guidance remains advisory and factual.

### 4. History Page

Open:

```text
http://localhost:5173/history
```

Verify:

- Saved analysis summaries load from the backend.
- Empty state appears if no saved analyses exist.
- New successful uploads appear after refresh.
- Each record shows filename, created date, target role when present, target criteria status, target alignment status, section count, skill signal count, and role profile count.
- Delete requires confirmation and removes only the selected record.
- No fake records appear.

### 5. Saved Result Page

From History, open a saved result.

Verify:

- URL uses `/results/{analysis_id}`.
- Result page loads without re-uploading the resume.
- The full analysis dashboard renders from stored canonical analysis data.
- Refreshing the result page still loads the saved analysis.
- `/results/invalid-id` shows a safe not-found state with navigation back to History and Upload CV.

### 6. HTML Report Download

From a loaded Result page, click Download HTML Report.

Verify:

- Browser downloads a `.html` file.
- The downloaded file opens independently in a browser.
- Report contains metadata, Application Target, Target Alignment, Resume Structure, ATS Metadata, Skill Signals, Role Matching Metadata, Extracted Text Preview, Improvement Guidance, and limitations.
- Report contains no scripts, external assets, fake score, hiring prediction, or acceptance guarantee.

### 7. Invalid Uploads

Verify structured error recovery for:

- Non-PDF file.
- Empty file.
- File larger than 5 MB.
- Malformed PDF.
- Password-protected PDF when available.
- Searchable-text failure or insufficient text when available.

Expected behavior:

- Errors are user-safe.
- No stack traces or internal exception names appear.
- Retry behavior preserves valid files when safe and asks for replacement when the selected file itself is invalid.
- Previous successful dashboard content does not remain visible after a failed new submission.

### 8. Backend Unavailable State

Stop the backend and keep the frontend running.

Verify:

- Upload shows a backend/network unavailable error.
- History shows a structured loading failure with retry.
- Result detail shows a structured error with retry.
- Restarting the backend allows retry or refresh to recover.

### 9. Responsive Checks

Check these viewport widths:

- `1280px`
- `768px`
- `390px`
- `320px`

Verify:

- No horizontal overflow.
- Navigation remains usable.
- Dashboard cards stack logically.
- Metadata badges do not clip.
- Touch targets remain usable.
- Text remains readable at a 200 percent browser zoom proxy.

### 10. Keyboard and Accessibility Smoke Test

Using keyboard only, verify:

- Primary navigation can be reached and activated.
- File input can be focused.
- Upload submit can be activated.
- Processing status is announced without stealing focus.
- Error states move focus to the error summary.
- Result success moves focus to the analysis summary or announces success.
- Extracted text preview expands and collapses with `aria-expanded`.
- History delete confirmation can be completed or canceled.
- Download HTML Report can be activated.
- Visible focus indicators remain present.

## API Smoke Checks

Health:

```bash
curl http://localhost:8000/health
```

List saved analyses:

```bash
curl "http://localhost:8000/analyses?limit=20&offset=0"
```

Download a report:

```bash
curl -OJ http://localhost:8000/analyses/<analysis_id>/report.html
```

## Known Limitations

- OCR is not implemented, so scanned or image-only PDFs may produce unreadable or insufficient-text states.
- Numeric ATS scoring is not implemented.
- AI or LLM analysis is not implemented.
- Hiring prediction, acceptance probability, and candidate ranking are not implemented.
- Persistence is local SQLite demo storage, not authenticated multi-user storage.
- PDF export is not implemented.
- Docker workflow remains blocked until a compatible runtime is available.

## Known Test Warning

Backend tests may emit a third-party Starlette/httpx `TestClient` deprecation warning. The current test suite still passes, and the warning does not indicate a CareerBoost AI application failure. Cleanup should be handled in a dedicated dependency-maintenance contract because resolving it safely may require coordinated FastAPI, Starlette, and httpx compatibility decisions.
