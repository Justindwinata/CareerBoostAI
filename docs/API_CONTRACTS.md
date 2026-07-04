# CareerBoost AI API Contracts

## Status

Release-readiness reference for the current local development API. These contracts describe the implemented backend surface for the portfolio/demo version of CareerBoost AI. They are not a public production API guarantee.

Default local base URL:

```text
http://localhost:8000
```

## Global Boundaries

- Authentication is not implemented.
- Requests are intended for local development and demo usage.
- Resume PDFs are validated and processed in memory; uploaded PDF binaries are not persisted.
- Completed successful analyses are stored in local SQLite as canonical analysis response JSON.
- Extracted text may be present inside the canonical response and therefore inside local history storage.
- Internal exceptions, stack traces, local paths, and database errors must not be exposed to API users.
- The API does not provide AI analysis, numeric ATS scoring, hiring prediction, acceptance probability, or candidate ranking.

## Endpoint Inventory

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/health` | `GET` | Backend process health check |
| `/resumes/upload` | `POST` | Validate a PDF resume, run deterministic analysis metadata, store successful analysis, and return the canonical result |
| `/analyses` | `GET` | List locally stored analysis summaries |
| `/analyses/{analysis_id}` | `GET` | Retrieve one stored canonical analysis result |
| `/analyses/{analysis_id}` | `DELETE` | Delete one stored analysis |
| `/analyses/{analysis_id}/report.html` | `GET` | Download a standalone HTML report for one stored analysis |

## `GET /health`

Purpose: verify that the FastAPI application process is running.

Request parameters: none.

Success status: `200 OK`.

Response shape:

```json
{
  "status": "ok",
  "service": "CareerBoost AI API",
  "version": "0.1.0",
  "environment": "development"
}
```

Common error cases:

- Backend process unavailable.
- Network connection refused.

Example:

```bash
curl http://localhost:8000/health
```

## `POST /resumes/upload`

Purpose: accept a resume PDF, validate it, extract text, generate deterministic metadata, persist successful completed analyses, and return the canonical analysis response.

Request content type: `multipart/form-data`.

Multipart fields:

| Field | Required | Description |
| --- | --- | --- |
| `file` | Yes | PDF resume file. The current backend limit is 5 MB. |
| `target_criteria` | No | JSON string containing optional Target Application Criteria. |

Target criteria JSON fields:

| Field | Type | Notes |
| --- | --- | --- |
| `target_role` | string | Optional role or internship title, max 120 characters |
| `target_description` | string | Optional job or role description, max 3000 characters |
| `required_skills` | string array | Optional explicit skill criteria, max 30 entries |
| `preferred_skills` | string array | Optional optional-skill criteria, max 30 entries |
| `required_sections` | string array | Supported values: `summary`, `skills`, `experience`, `education`, `projects`, `certifications` |
| `analysis_priorities` | string array | Supported values: `resume_structure`, `ats_compatibility`, `skill_visibility`, `role_alignment`, `project_evidence`, `education_fit` |
| `experience_expectation` | string | Optional plain-text expectation, max 500 characters |
| `education_expectation` | string | Optional plain-text expectation, max 500 characters |
| `notes` | string | Optional context notes, max 1000 characters |

Success status: `202 Accepted`.

Successful response shape summary:

- `analysis_id`: public UUID string for persisted successful analyses.
- `status`: canonical workflow status.
- `intake`: filename, file size, upload timestamp, and upload validation status.
- `extraction`: extraction status, confidence metadata, normalized text, detected sections, extracted-text preview, and advisory parsing warnings.
- `completeness`: deterministic section presence metadata.
- `target_criteria`: validated and normalized criteria metadata with `not_provided` or `provided` status.
- `target_alignment`: factual deterministic alignment metadata when criteria are provided.
- `ats`: deterministic ATS feedback metadata with no score.
- `skills`: explicit skill signal metadata only.
- `roles`: deterministic internship role metadata without ranking.
- `recommendations`: deterministic improvement guidance when evidence-backed rules produce guidance.

Common error cases:

| Status | Cause |
| --- | --- |
| `422 Unprocessable Content` | Missing file, unsupported file type, file too large, empty file, malformed PDF, password-protected PDF, unreadable PDF, insufficient extracted text, invalid `target_criteria` JSON |
| `500 Internal Server Error` | Completed analysis could not be saved to local history storage |

Privacy notes:

- PDF binary content is not saved.
- Successful canonical response JSON is saved locally for history and report generation.
- Do not upload private resumes to shared demo machines.

Upload without target criteria:

```bash
curl -X POST http://localhost:8000/resumes/upload \
  -F "file=@assets/demo/careerboost-demo-resume.pdf;type=application/pdf"
```

Upload with target criteria:

```bash
curl -X POST http://localhost:8000/resumes/upload \
  -F "file=@assets/demo/careerboost-demo-resume.pdf;type=application/pdf" \
  -F 'target_criteria={"target_role":"Frontend Developer Intern","required_skills":["React","TypeScript"],"preferred_skills":["Docker"],"required_sections":["summary","skills","projects"],"analysis_priorities":["resume_structure","skill_visibility","role_alignment"]}'
```

## `GET /analyses`

Purpose: list locally stored completed analysis summaries, newest first.

Query parameters:

| Parameter | Default | Constraints | Description |
| --- | --- | --- | --- |
| `limit` | `20` | `1` to `100` | Maximum summaries returned |
| `offset` | `0` | `0` or greater | Number of summaries skipped |

Success status: `200 OK`.

Response shape summary:

```json
[
  {
    "analysis_id": "uuid",
    "created_at": "ISO-8601 timestamp",
    "filename": "resume.pdf",
    "target_role": "Frontend Developer Intern",
    "target_criteria_status": "provided",
    "target_alignment_status": "evaluated",
    "detected_section_count": 5,
    "skill_signal_count": 8,
    "role_profile_count": 5
  }
]
```

Common error cases:

- `500 Internal Server Error` when local history storage is unavailable.

Example:

```bash
curl "http://localhost:8000/analyses?limit=20&offset=0"
```

## `GET /analyses/{analysis_id}`

Purpose: retrieve the full stored canonical analysis response for a saved analysis.

Path parameters:

| Parameter | Description |
| --- | --- |
| `analysis_id` | Public UUID returned by successful upload |

Success status: `200 OK`.

Response shape: the full canonical analysis response described in `POST /resumes/upload`.

Common error cases:

| Status | Cause |
| --- | --- |
| `404 Not Found` | No stored analysis exists for the requested ID |
| `500 Internal Server Error` | Local history storage is unavailable |

Example:

```bash
curl http://localhost:8000/analyses/<analysis_id>
```

## `DELETE /analyses/{analysis_id}`

Purpose: delete a locally stored analysis by public analysis ID.

Success status: `200 OK`.

Response shape:

```json
{
  "detail": "Analysis record deleted."
}
```

Common error cases:

| Status | Cause |
| --- | --- |
| `404 Not Found` | No stored analysis exists for the requested ID |
| `500 Internal Server Error` | Local history storage is unavailable |

Example:

```bash
curl -X DELETE http://localhost:8000/analyses/<analysis_id>
```

## `GET /analyses/{analysis_id}/report.html`

Purpose: generate and download a standalone HTML report from a stored canonical analysis response.

Success status: `200 OK`.

Response headers:

- `Content-Type: text/html; charset=utf-8`
- `Content-Disposition: attachment; filename="careerboost-analysis-{analysis_id}.html"`

Report properties:

- Self-contained HTML with inline CSS.
- Generated from stored deterministic metadata.
- No inline JavaScript.
- No external scripts, fonts, analytics, or network assets.
- No PDF export.
- No AI, score, hiring prediction, or acceptance guarantee.

Common error cases:

| Status | Cause |
| --- | --- |
| `404 Not Found` | No stored analysis exists for the requested ID |
| `500 Internal Server Error` | Local history storage is unavailable |

Example:

```bash
curl -OJ http://localhost:8000/analyses/<analysis_id>/report.html
```

## Frontend Integration Notes

- The frontend uses `VITE_API_BASE_URL`, defaulting to `http://localhost:8000`.
- Uploads send the PDF under the `file` multipart field.
- Target criteria are serialized as JSON into the optional `target_criteria` multipart field.
- History, result detail, delete, and report download all use the stored `analysis_id`.
- The frontend must continue treating all API errors as user-safe categories, never raw backend exceptions.
