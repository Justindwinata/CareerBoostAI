# Demo Assets

This document defines how CareerBoost AI demo visuals are created and maintained. Demo assets must represent the real running application and must never use private resume data.

## Fictional Resume Policy

The committed demo resume is:

- `assets/demo/careerboost-demo-resume.pdf`

The resume uses fictional data only:

- Name: Alex Morgan
- Email domain: `example.test`
- Location: Example City
- Education, experience, and projects: fictional entries created for product demonstration

Do not replace this file with a real resume, real contact details, a real address, or private candidate information.

## Captured Application States

| Asset | Viewport | State |
| --- | ---: | --- |
| `assets/screenshots/upload-desktop.png` | 1280px | Initial upload page |
| `assets/screenshots/processing-desktop.png` | 1280px | Upload request in progress |
| `assets/screenshots/dashboard-desktop.png` | 1280px | Completed deterministic analysis dashboard |
| `assets/screenshots/error-desktop.png` | 1280px | Structured empty-upload error |
| `assets/screenshots/upload-mobile.png` | 390px | Initial upload page on mobile |
| `assets/screenshots/dashboard-mobile.png` | 390px | Completed deterministic analysis dashboard on mobile |

No animated GIF is committed because static screenshots currently provide a clearer and more reliable repository preview.

## Capture Method

Screenshots were captured from the local running application:

- Backend: FastAPI on `http://127.0.0.1:8000`
- Frontend: Vite on `http://localhost:5173`
- Browser: local Chrome controlled through Chrome DevTools Protocol
- Demo resume: `assets/demo/careerboost-demo-resume.pdf`

The completed dashboard screenshots were produced by uploading the fictional demo PDF through the existing UI. The processing screenshot was captured while the real upload request was paused temporarily by the browser capture tool and then continued to the backend.

## Regeneration Steps

1. Start the backend:

   ```bash
   backend/.venv/bin/python -m uvicorn careerboost_api.main:app --app-dir backend/src --host 127.0.0.1 --port 8000
   ```

2. Start the frontend:

   ```bash
   npm --prefix frontend run dev -- --host localhost
   ```

3. Open `http://localhost:5173` in a browser automation tool that supports:

   - viewport control
   - file input upload
   - full-page PNG screenshots
   - temporary request pausing for the processing-state capture

4. Upload `assets/demo/careerboost-demo-resume.pdf`.

5. Capture the six states listed above and overwrite the files in `assets/screenshots/`.

6. Validate the generated images:

   ```bash
   file assets/screenshots/*.png assets/demo/careerboost-demo-resume.pdf
   du -h assets/screenshots/*.png assets/demo/careerboost-demo-resume.pdf
   ```

7. Run repository validation:

   ```bash
   make check
   make pre-commit
   ```

## Privacy Precautions

- Use fictional resume content only.
- Confirm screenshots contain no terminal windows, developer tools, local absolute paths, or private user data.
- Keep image file sizes suitable for GitHub repository browsing.
- Do not claim AI scoring, recommendations, persistence, or production deployment from these assets.
