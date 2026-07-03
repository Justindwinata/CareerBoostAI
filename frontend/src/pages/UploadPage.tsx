import { ResumeUploadForm } from "../components/ResumeUploadForm";

export function UploadPage() {
  return (
    <section className="page-shell" aria-labelledby="upload-page-title">
      <header className="page-header">
        <p className="eyebrow">Upload CV</p>
        <h1 id="upload-page-title">Upload a resume for deterministic analysis.</h1>
        <p>
          Submit a searchable PDF resume to validate the document, extract text, and review
          deterministic metadata in the current session.
        </p>
      </header>

      <ResumeUploadForm />
    </section>
  );
}
