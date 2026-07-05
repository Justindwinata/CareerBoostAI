# Demo Assets

## Status

Canonical policy and regeneration guide for CareerBoost AI product screenshots. Demo assets must represent the real running application and must never use private resume data.

## Fictional Resume Policy

The committed demo resume is:

```text
assets/demo/careerboost-demo-resume.pdf
```

The resume uses fictional data only:

- Name: Alex Morgan
- Email domain: `example.test`
- Location: Example City
- Education, experience, and projects: fictional entries created for product demonstration

Do not replace this file with a real resume, real contact details, a real address, Justin Dwinata's real CV, or private candidate information.

## Sprint 5 Capture Scope

The current screenshots were refreshed after Sprint 5 product workflow expansion. They show:

- Home page
- Upload CV page with Target Application Criteria
- Deterministic analysis dashboard
- Target Alignment metadata
- Improvement Guidance
- Local saved History
- Stored Result detail
- Download HTML Report action
- Standalone HTML report preview
- Mobile Home, Upload, and Result views

The assets do not claim AI analysis, numeric scoring, hiring prediction, ATS pass/fail status, or production deployment.

## Target Criteria Used

The Sprint 5 screenshots use this fictional target context:

| Field | Value |
| --- | --- |
| Target role | `Frontend Developer Intern` |
| Target description | `We are looking for an intern who can build responsive web interfaces, work with React and TypeScript, consume REST APIs, and collaborate using Git.` |
| Required skills | `React`, `TypeScript`, `JavaScript`, `HTML`, `CSS`, `Git` |
| Preferred skills | `Vite`, `REST API`, `PostgreSQL`, `Accessibility` |
| Required sections | `summary`, `skills`, `projects`, `education` |
| Analysis priorities | `resume_structure`, `ats_compatibility`, `skill_visibility`, `role_alignment`, `project_evidence`, `education_fit` |
| Experience expectation | `Internship level; academic and portfolio projects are acceptable.` |
| Education expectation | `Computer Science, Informatics, or related field preferred.` |
| Notes | `Focus on frontend internship readiness.` |

These criteria intentionally produce both found and not-found deterministic metadata states without changing product logic for screenshots.

## Screenshot Inventory

| Asset | Viewport | State |
| --- | ---: | --- |
| `assets/screenshots/home-desktop.png` | 1280px | Home page with product workflow overview |
| `assets/screenshots/upload-target-criteria-desktop.png` | 1280px | Upload CV page showing Target Application Criteria |
| `assets/screenshots/dashboard-improvement-guidance-desktop.png` | 1280px | Completed analysis dashboard with Application Target, Target Alignment, and Improvement Guidance |
| `assets/screenshots/history-desktop.png` | 1280px | History page with one real saved fictional analysis |
| `assets/screenshots/result-detail-desktop.png` | 1280px | Stored result detail page rendered from local history |
| `assets/screenshots/report-download-desktop.png` | 1280px | Result detail header with Download HTML Report action visible |
| `assets/screenshots/html-report-preview-desktop.png` | 1280px | Standalone generated HTML report preview |
| `assets/screenshots/home-mobile.png` | 390px | Home page on mobile |
| `assets/screenshots/upload-mobile.png` | 390px | Upload CV page with target criteria on mobile |
| `assets/screenshots/result-mobile.png` | 390px | Stored result dashboard on mobile |

Older Sprint 4 screenshots may remain in `assets/screenshots` for historical documentation references, but the README and this guide use the refreshed Sprint 5 assets above.

## Capture Method

Screenshots were captured from the local running application:

- Backend: FastAPI on `http://127.0.0.1:8000`
- Frontend: Vite on `http://localhost:5173`
- Local history storage: temporary SQLite database outside committed source control
- Demo resume: `assets/demo/careerboost-demo-resume.pdf`
- Browser: local in-app browser automation with explicit viewport control

The saved analysis record was created by uploading the fictional PDF to the real backend upload endpoint with the target criteria above. The History and Result screenshots read from the backend history API. The HTML report preview was generated from the real report endpoint and served temporarily for browser preview capture; the report artifact itself is not committed.

## Regeneration Steps

1. Start the backend with temporary demo storage:

   ```bash
   ANALYSIS_HISTORY_DATABASE_PATH=data/careerboost_demo_assets.sqlite3 backend/.venv/bin/python -m uvicorn careerboost_api.main:app --app-dir backend/src --host 127.0.0.1 --port 8000
   ```

2. Start the frontend:

   ```bash
   npm --prefix frontend run dev -- --host localhost --port 5173
   ```

3. Create a saved analysis by uploading `assets/demo/careerboost-demo-resume.pdf` with the target criteria in this document.

4. Capture the desktop screenshots at 1280px width.

5. Capture the mobile screenshots at 390px width.

6. Validate narrow mobile layout at 320px width.

7. Generate an HTML report from:

   ```text
   http://127.0.0.1:8000/analyses/{analysis_id}/report.html
   ```

8. Preview the generated report locally and capture `assets/screenshots/html-report-preview-desktop.png`.

9. Validate the generated images:

   ```bash
   file assets/screenshots/*.png assets/demo/careerboost-demo-resume.pdf
   du -h assets/screenshots/*.png assets/demo/careerboost-demo-resume.pdf
   ```

10. Run repository validation:

   ```bash
   make check
   make pre-commit
   ```

## Privacy Precautions

- Use fictional resume content only.
- Do not commit real resumes, real phone numbers, real addresses, or private candidate data.
- Confirm screenshots contain no terminal windows, developer tools, local absolute paths, browser file paths, or private user data.
- Keep temporary SQLite databases and generated report files out of Git.
- Keep image file sizes suitable for GitHub repository browsing.
- Do not claim AI scoring, ATS scoring, hiring prediction, acceptance probability, production authentication, or production deployment from these assets.

## Known Limitations

- OCR is not implemented, so scanned or image-only PDFs are not represented by these screenshots.
- The standalone report screenshot is an HTML preview, not a PDF export.
- The saved History and Result screenshots use local demo persistence, not authenticated user storage.
- Docker remains blocked until a compatible runtime is available.
