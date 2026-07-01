import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { ResumeUploadForm } from "./ResumeUploadForm";

const LONG_EXTRACTED_TEXT =
  "Professional Summary\n" +
  "Backend-focused student developer building production-quality portfolio projects with React, TypeScript, FastAPI, PostgreSQL, automated tests, clean architecture, and careful documentation.\n" +
  "Technical Skills\n" +
  "Python, FastAPI, TypeScript, React, PostgreSQL, testing, linting, CI, Git, and API design.\n" +
  "Projects\n" +
  "CareerBoost AI resume intake pipeline with deterministic text extraction, section detection, completeness metadata, and recruiter-demo-ready upload results.";

function createPdfFile(name = "resume.pdf") {
  return new File(["%PDF-1.7"], name, { type: "application/pdf" });
}

function createUploadSuccessResponse() {
  return new Response(JSON.stringify(createSuccessfulUploadResponse()), {
    headers: { "Content-Type": "application/json" },
    status: 202,
  });
}

function createDeferredResponse() {
  let resolve!: (response: Response) => void;

  const promise = new Promise<Response>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return {
    promise,
    resolve,
  };
}

function createApiErrorResponse(detail: string) {
  return new Response(JSON.stringify({ detail }), {
    headers: { "Content-Type": "application/json" },
    status: 422,
  });
}

function createSuccessfulUploadResponse(
  completeness: unknown = {
    expected_sections: ["summary", "skills", "experience", "education", "projects"],
    present_sections: ["summary", "skills", "projects"],
    missing_sections: ["experience", "education"],
    score: 0.6,
  },
  sections: unknown = [
    {
      name: "summary",
      heading: "Professional Summary",
      start_line: 1,
      end_line: 3,
      content: "Backend-focused student developer.",
    },
    {
      name: "skills",
      heading: "Technical Skills",
      start_line: 4,
      end_line: 6,
      content: "Python, FastAPI, React",
    },
    {
      name: "projects",
      heading: "Projects",
      start_line: 7,
      end_line: 7,
      content: "CareerBoost AI",
    },
  ],
  extractedText = LONG_EXTRACTED_TEXT,
  ats: unknown = {
    status: "metadata_ready",
    source: "deterministic_resume_signals",
    issues: [
      {
        category: "section_presence",
        severity: "warning",
        title: "Expected section not detected",
        description: "The Experience section was not detected by deterministic resume headings.",
        observed_signal: "missing_section:experience",
        related_sections: ["experience"],
      },
      {
        category: "formatting_risk",
        severity: "warning",
        title: "Low extracted text volume",
        description:
          "The extracted text length is below the deterministic metadata review threshold.",
        observed_signal: "character_count:<600",
        related_sections: [],
      },
      {
        category: "keyword_coverage_placeholder",
        severity: "info",
        title: "Keyword coverage not evaluated",
        description: "Keyword coverage requires a future role-specific keyword source.",
        observed_signal: "keyword_coverage:not_evaluated",
        related_sections: [],
      },
    ],
    keyword_coverage: {
      status: "not_evaluated",
      matched_keywords: [],
      missing_keywords: [],
    },
    score: {
      status: "not_scored",
      score: null,
    },
  },
  skills: unknown = {
    status: "signals_detected",
    source: "deterministic_normalized_text",
    signals: [
      {
        name: "Python",
        category: "programming_language",
        evidence_level: "explicit_mention",
        evidence: [
          {
            matched_text: "python",
            source_area: "skills",
            line_number: 4,
            evidence_text:
              "Python, FastAPI, TypeScript, React, PostgreSQL, testing, linting, CI, Git, and API design.",
          },
        ],
      },
      {
        name: "FastAPI",
        category: "framework",
        evidence_level: "explicit_mention",
        evidence: [
          {
            matched_text: "fastapi",
            source_area: "skills",
            line_number: 4,
            evidence_text:
              "Python, FastAPI, TypeScript, React, PostgreSQL, testing, linting, CI, Git, and API design.",
          },
        ],
      },
      {
        name: "PostgreSQL",
        category: "database",
        evidence_level: "explicit_mention",
        evidence: [
          {
            matched_text: "postgresql",
            source_area: "skills",
            line_number: 4,
            evidence_text:
              "Python, FastAPI, TypeScript, React, PostgreSQL, testing, linting, CI, Git, and API design.",
          },
        ],
      },
    ],
  },
  roles: unknown = {
    status: "metadata_ready",
    source: "deterministic_resume_metadata",
    candidates: [
      {
        role_name: "Backend Developer Intern",
        match_status: "partial_match",
        confidence_state: "metadata_ready",
        deterministic_evidence: ["Explicit required skill signal detected: Python"],
        matched_skill_signals: ["Python", "FastAPI"],
        missing_required_signals: ["SQL"],
        supporting_sections: ["skills", "projects"],
      },
      {
        role_name: "Frontend Developer Intern",
        match_status: "partial_match",
        confidence_state: "metadata_ready",
        deterministic_evidence: ["Explicit required skill signal detected: React"],
        matched_skill_signals: ["React", "TypeScript"],
        missing_required_signals: ["CSS"],
        supporting_sections: ["skills", "projects"],
      },
      {
        role_name: "Full Stack Developer Intern",
        match_status: "partial_match",
        confidence_state: "metadata_ready",
        deterministic_evidence: ["Explicit required skill signal detected: FastAPI"],
        matched_skill_signals: ["React", "TypeScript", "FastAPI"],
        missing_required_signals: ["SQL"],
        supporting_sections: ["skills", "projects"],
      },
      {
        role_name: "Data Analyst Intern",
        match_status: "partial_match",
        confidence_state: "metadata_ready",
        deterministic_evidence: ["Explicit required skill signal detected: Python"],
        matched_skill_signals: ["Python"],
        missing_required_signals: ["SQL"],
        supporting_sections: ["skills", "projects"],
      },
      {
        role_name: "Machine Learning Intern",
        match_status: "partial_match",
        confidence_state: "metadata_ready",
        deterministic_evidence: ["Explicit required skill signal detected: Python"],
        matched_skill_signals: ["Python"],
        missing_required_signals: ["SQL"],
        supporting_sections: ["skills", "projects"],
      },
    ],
  },
) {
  return {
    status: "intake_completed",
    intake: {
      status: "accepted",
      filename: "resume.pdf",
      content_type: "application/pdf",
      size_bytes: 2048,
    },
    extraction: {
      status: "extracted",
      confidence: "medium",
      character_count: extractedText.length,
      page_count: 1,
      extracted_text: extractedText,
      normalized_text: extractedText,
      sections,
      error: null,
    },
    completeness,
    ats,
    skills,
    roles,
    recommendations: {
      status: "not_started",
      name: "recommendations",
      label: "Learning recommendations",
    },
  };
}

function expectStructuredError({
  title,
  explanation,
  recovery,
  actionLabel,
}: {
  title: string;
  explanation: string;
  recovery: string;
  actionLabel: string;
}) {
  const errorPanel = screen.getByRole("alert");

  expect(within(errorPanel).getByText("Upload Error")).toBeVisible();
  expect(within(errorPanel).getByRole("heading", { name: title })).toBeVisible();
  expect(within(errorPanel).getByText(explanation)).toBeVisible();
  expect(within(errorPanel).getByText("Recovery")).toBeVisible();
  expect(within(errorPanel).getByText(recovery)).toBeVisible();
  expect(within(errorPanel).getByRole("button", { name: actionLabel })).toBeVisible();
}

function expectValidAriaIdReferences() {
  const referencedAttributes = ["aria-controls", "aria-describedby", "aria-labelledby"];

  referencedAttributes.forEach((attributeName) => {
    document.querySelectorAll<HTMLElement>(`[${attributeName}]`).forEach((element) => {
      const referencedIds = element.getAttribute(attributeName)?.split(/\s+/).filter(Boolean) ?? [];

      referencedIds.forEach((referencedId) => {
        expect(document.getElementById(referencedId)).not.toBeNull();
      });
    });
  });
}

describe("ResumeUploadForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("provides accessible labels and descriptions for resume file selection", () => {
    render(<ResumeUploadForm />);

    const uploadForm = screen.getByRole("form", { name: "Resume upload form" });
    const fileInput = screen.getByLabelText("Select PDF resume");

    expect(screen.getByRole("heading", { name: "Upload a PDF resume" })).toBeVisible();
    expect(uploadForm).toHaveAttribute("aria-describedby", "upload-description");
    expect(document.getElementById("upload-description")).toHaveTextContent(
      "This foundation step validates the file and extracts readable text.",
    );
    expect(fileInput).toHaveAttribute("aria-describedby", "resume-file-help");
    expect(screen.getByText("PDF only. Maximum file size is 5 MB.")).toBeVisible();
    expectValidAriaIdReferences();
  });

  it("focuses a clear empty-upload error when submitting without a selected file", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    render(<ResumeUploadForm />);

    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
    expectStructuredError({
      title: "No file selected",
      explanation: "Choose a PDF resume before starting the upload workflow.",
      recovery: "Select a PDF file from your device.",
      actionLabel: "Choose replacement file",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows an accessible processing state immediately after submit", async () => {
    const deferredResponse = createDeferredResponse();
    vi.spyOn(globalThis, "fetch").mockReturnValueOnce(deferredResponse.promise);

    render(<ResumeUploadForm />);

    const fileInput = screen.getByLabelText("Select PDF resume");
    fireEvent.change(fileInput, {
      target: { files: [createPdfFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(screen.getByRole("heading", { name: "Processing document metadata" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Resume processing is in progress. Keep this page open while the request completes.",
    );
    expect(screen.getByLabelText("Expected processing workflow")).toBeVisible();
    expect(screen.getByText("Uploading resume")).toBeVisible();
    expect(screen.getByText("Validating document")).toBeVisible();
    expect(screen.getByText("Extracting text")).toBeVisible();
    expect(screen.getByText("Preparing analysis metadata")).toBeVisible();
    expect(screen.getByText("Rendering results")).toBeVisible();
    expect(fileInput).toBeDisabled();
    expect(screen.getByRole("button", { name: "Processing resume..." })).toBeDisabled();
    expect(screen.getByRole("form", { name: "Resume upload form" })).toHaveAttribute(
      "aria-busy",
      "true",
    );

    deferredResponse.resolve(createUploadSuccessResponse());
    expect(await screen.findByRole("heading", { name: "Resume upload accepted" })).toBeVisible();
  });

  it("prevents duplicate submissions while processing", () => {
    const deferredResponse = createDeferredResponse();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockReturnValueOnce(deferredResponse.promise);

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    const processingButton = screen.getByRole("button", { name: "Processing resume..." });
    fireEvent.click(processingButton);
    fireEvent.submit(processingButton.closest("form") as HTMLFormElement);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("transitions from processing state to the analysis dashboard after success", async () => {
    const deferredResponse = createDeferredResponse();
    vi.spyOn(globalThis, "fetch").mockReturnValueOnce(deferredResponse.promise);

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(screen.getByRole("heading", { name: "Processing document metadata" })).toBeVisible();

    deferredResponse.resolve(createUploadSuccessResponse());

    expect(await screen.findByRole("heading", { name: "Resume upload accepted" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Processing document metadata" })).toBeNull();
    expect(screen.getByLabelText("Select PDF resume")).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Upload resume" })).not.toBeDisabled();
    await waitFor(() =>
      expect(screen.getByLabelText("Deterministic pipeline overview")).toHaveFocus(),
    );
  });

  it("restores controls and shows retry guidance after upload failure", async () => {
    const deferredResponse = createDeferredResponse();
    vi.spyOn(globalThis, "fetch").mockReturnValueOnce(deferredResponse.promise);

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile("invalid.pdf")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(screen.getByRole("heading", { name: "Processing document metadata" })).toBeVisible();

    deferredResponse.resolve(
      new Response(JSON.stringify({ detail: "Resume file is not a valid PDF." }), {
        headers: { "Content-Type": "application/json" },
        status: 422,
      }),
    );

    await screen.findByRole("alert");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
    expectStructuredError({
      title: "Invalid PDF",
      explanation: "The selected file could not be read as a valid PDF document.",
      recovery: "Export the resume as a fresh searchable PDF.",
      actionLabel: "Choose replacement file",
    });
    await waitFor(() => expect(screen.getByLabelText("Select PDF resume")).not.toBeDisabled());
    expect(screen.getByRole("button", { name: "Upload resume" })).not.toBeDisabled();
    expect(screen.queryByRole("heading", { name: "Processing document metadata" })).toBeNull();
  });

  it.each([
    {
      name: "unsupported file type",
      file: new File(["resume"], "resume.txt", { type: "text/plain" }),
      title: "Unsupported file type",
      explanation: "CareerBoost AI currently accepts PDF resume files only.",
      recovery: "Choose a PDF file.",
      actionLabel: "Choose replacement file",
    },
    {
      name: "empty file",
      file: new File([], "resume.pdf", { type: "application/pdf" }),
      title: "File is empty",
      explanation: "The selected file does not contain uploadable resume content.",
      recovery: "Choose a PDF resume that contains content.",
      actionLabel: "Choose replacement file",
    },
    {
      name: "oversized file",
      file: new File(["0".repeat(5 * 1024 * 1024 + 1)], "resume.pdf", {
        type: "application/pdf",
      }),
      title: "File is too large",
      explanation: "The selected resume is larger than the current 5 MB upload limit.",
      recovery: "Keep the file below the current size limit.",
      actionLabel: "Choose replacement file",
    },
  ])("shows structured local validation errors for $name", ({ file, ...expectedError }) => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [file] },
    });

    expectStructuredError(expectedError);
    expect(screen.getByText("Choose a replacement file before submitting again.")).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    {
      detail: "Resume file is not a valid PDF.",
      title: "Invalid PDF",
      explanation: "The selected file could not be read as a valid PDF document.",
      recovery: "Export the resume as a fresh searchable PDF.",
    },
    {
      detail: "Password-protected PDFs are not supported.",
      title: "Password-protected PDF",
      explanation: "Password-protected PDFs cannot be processed in the current upload workflow.",
      recovery: "Remove the PDF password before uploading.",
    },
    {
      detail: "Resume text could not be extracted from this PDF.",
      title: "Unreadable PDF",
      explanation: "Readable resume text could not be extracted from this PDF.",
      recovery: "Export the resume as a searchable PDF.",
    },
  ])("maps backend PDF error '$detail' to a structured error", async (errorCase) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(createApiErrorResponse(errorCase.detail));

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile("resume.pdf")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    await screen.findByRole("alert");
    expectStructuredError({
      title: errorCase.title,
      explanation: errorCase.explanation,
      recovery: errorCase.recovery,
      actionLabel: "Choose replacement file",
    });
    expect(screen.queryByText(errorCase.detail)).not.toBeInTheDocument();
  });

  it("maps insufficient extracted text responses to a structured error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "failed",
          intake: {
            status: "accepted",
            filename: "blank.pdf",
            content_type: "application/pdf",
            size_bytes: 2048,
          },
          extraction: {
            status: "failed",
            confidence: null,
            character_count: 0,
            page_count: 0,
            extracted_text: null,
            normalized_text: null,
            sections: [],
            error: {
              category: "low_text",
              message: "Resume text is too short to analyze. Upload a text-based PDF resume.",
            },
          },
          completeness: null,
          ats: {
            status: "not_started",
            name: "ats",
            label: "ATS analysis",
          },
          skills: {
            status: "not_started",
            name: "skills",
            label: "Skill extraction",
          },
          roles: {
            status: "not_started",
            name: "roles",
            label: "Role matching",
          },
          recommendations: {
            status: "not_started",
            name: "recommendations",
            label: "Learning recommendations",
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 422,
        },
      ),
    );

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile("blank.pdf")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    await screen.findByRole("alert");
    expectStructuredError({
      title: "Insufficient resume text",
      explanation: "The PDF does not contain enough readable text for deterministic processing.",
      recovery: "Upload a text-based resume PDF instead of a scanned or blank file.",
      actionLabel: "Choose replacement file",
    });
    expect(
      screen.queryByText("Resume text is too short to analyze. Upload a text-based PDF resume."),
    ).not.toBeInTheDocument();
  });

  it("maps network failures to a retryable structured error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Failed to fetch"));

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile("resume.pdf")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    await screen.findByRole("alert");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
    expectStructuredError({
      title: "Backend connection unavailable",
      explanation: "The upload request could not reach the CareerBoost AI backend.",
      recovery: "Check the backend connection and try again.",
      actionLabel: "Retry upload",
    });
    expect(screen.getByText("resume.pdf can be retried.")).toBeVisible();
    expect(screen.queryByText("Failed to fetch")).not.toBeInTheDocument();
  });

  it("maps unexpected backend details to a generic structured error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createApiErrorResponse("Traceback: internal parser failure"),
    );

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile("resume.pdf")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    await screen.findByRole("alert");
    expectStructuredError({
      title: "Upload could not be completed",
      explanation: "The upload request ended before CareerBoost AI could process the resume.",
      recovery: "Try again with the selected PDF, or choose a new PDF if the issue repeats.",
      actionLabel: "Retry upload",
    });
    expect(screen.queryByText("Traceback: internal parser failure")).not.toBeInTheDocument();
  });

  it("retries a preserved valid file without creating duplicate retry requests", async () => {
    const retryResponse = createDeferredResponse();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockReturnValueOnce(retryResponse.promise);

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile("resume.pdf")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Backend connection unavailable");
    const retryButton = screen.getByRole("button", { name: "Retry upload" });

    fireEvent.click(retryButton);
    fireEvent.click(screen.getByRole("button", { name: "Processing resume..." }));

    expect(fetchSpy).toHaveBeenCalledTimes(2);

    retryResponse.resolve(createUploadSuccessResponse());
    expect(await screen.findByRole("heading", { name: "Resume upload accepted" })).toBeVisible();
  });

  it("requires replacing invalid files before retrying", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(createUploadSuccessResponse());

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [new File(["resume"], "resume.txt", { type: "text/plain" })] },
    });

    expectStructuredError({
      title: "Unsupported file type",
      explanation: "CareerBoost AI currently accepts PDF resume files only.",
      recovery: "Choose a PDF file.",
      actionLabel: "Choose replacement file",
    });

    fireEvent.click(screen.getByRole("button", { name: "Choose replacement file" }));
    expect(screen.getByLabelText("Select PDF resume")).toHaveFocus();

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile("replacement.pdf")] },
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(await screen.findByRole("heading", { name: "Resume upload accepted" })).toBeVisible();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("clears stale errors and previous dashboard results after a new valid submission fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(createUploadSuccessResponse())
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile("first.pdf")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(await screen.findByRole("heading", { name: "Resume upload accepted" })).toBeVisible();

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile("second.pdf")] },
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Backend connection unavailable");
    expect(
      screen.queryByRole("heading", { name: "Resume upload accepted" }),
    ).not.toBeInTheDocument();
  });

  it("renders the upload result panel after a successful upload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(createSuccessfulUploadResponse()), {
        headers: { "Content-Type": "application/json" },
        status: 202,
      }),
    );

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(await screen.findByRole("heading", { name: "Resume upload accepted" })).toBeVisible();
    expect(screen.getByText("Analysis Dashboard")).toBeVisible();
    expect(
      screen.getByText(
        "Deterministic intake metadata from the current upload session. No scores, ordered matches, or AI interpretation is applied.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Analysis dashboard sections" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Resume Intake" })).toHaveAttribute(
      "href",
      "#resume-intake-title",
    );
    expect(screen.getByRole("link", { name: "Resume Structure" })).toHaveAttribute(
      "href",
      "#resume-structure-title",
    );
    expect(screen.getByRole("link", { name: "Skill Signals" })).toHaveAttribute(
      "href",
      "#skill-signals-title",
    );
    expect(screen.getByRole("link", { name: "ATS Metadata" })).toHaveAttribute(
      "href",
      "#ats-feedback-title",
    );
    expect(screen.getByRole("link", { name: "Role Matching" })).toHaveAttribute(
      "href",
      "#role-matches-title",
    );
    expect(screen.getByText("resume.pdf")).toBeVisible();
    expect(screen.getByText("2.0 KB")).toBeVisible();
    expect(screen.getByText("Accepted PDF resume")).toBeVisible();
    expect(screen.getByText("Text extraction complete")).toBeVisible();
    expect(screen.getByText("Medium confidence")).toBeVisible();
    expect(screen.getByText(`${LONG_EXTRACTED_TEXT.length} readable characters`)).toBeVisible();
    expect(screen.getByText("1")).toBeVisible();
    expect(screen.getByText("Analysis Summary")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Deterministic pipeline overview" })).toBeVisible();
    const summaryPanel = screen.getByLabelText("Deterministic pipeline overview");
    expect(within(summaryPanel).getByText("Upload status")).toBeVisible();
    expect(within(summaryPanel).getByText("Accepted")).toBeVisible();
    expect(within(summaryPanel).getByText("Extraction status")).toBeVisible();
    expect(within(summaryPanel).getByText("Extracted")).toBeVisible();
    expect(within(summaryPanel).getByText("Completeness status")).toBeVisible();
    expect(within(summaryPanel).getAllByText("Available").length).toBeGreaterThanOrEqual(3);
    expect(within(summaryPanel).getByText("Detected sections")).toBeVisible();
    expect(within(summaryPanel).getAllByText("3 detected")).toHaveLength(2);
    expect(within(summaryPanel).getByText("Explicit skill signals")).toBeVisible();
    expect(within(summaryPanel).getByText("ATS metadata status")).toBeVisible();
    expect(within(summaryPanel).getByText("Role matching status")).toBeVisible();
    expect(within(summaryPanel).getByText("Overall pipeline status")).toBeVisible();
    expect(within(summaryPanel).getByText("Deterministic pipeline complete")).toBeVisible();
    expect(summaryPanel).not.toHaveTextContent(/recommended/i);
    expect(summaryPanel).not.toHaveTextContent(/suitable/i);
    expect(summaryPanel).not.toHaveTextContent(/strong/i);
    expect(summaryPanel).not.toHaveTextContent(/weak/i);
    expect(summaryPanel).not.toHaveTextContent(/good/i);
    expect(summaryPanel).not.toHaveTextContent(/bad/i);
    expect(summaryPanel).not.toHaveTextContent(/ready/i);
    expect(screen.getByText("Completeness Baseline")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Upload and extraction metadata" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Completeness and detected sections" }),
    ).toBeVisible();
    expect(screen.getByText("3 of 5 expected sections detected (60%)")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Present sections" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Missing sections" })).toBeVisible();
    expect(screen.getAllByText("Summary").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Skills").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Projects").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Experience")).toBeVisible();
    expect(screen.getByText("Education")).toBeVisible();
    expect(screen.getByText("Detected Sections")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Detected headings and line ranges" }),
    ).toBeVisible();
    expect(screen.getByText("Professional Summary")).toBeVisible();
    expect(screen.getByText("Technical Skills")).toBeVisible();
    expect(screen.getByText("Lines 1-3")).toBeVisible();
    expect(screen.getByText("Lines 4-6")).toBeVisible();
    expect(screen.getByText("Line 7")).toBeVisible();
    expect(screen.getByText("Extracted Text Preview")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Extracted resume text" })).toBeVisible();
    expect(screen.getAllByText(/Professional Summary/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: "Expand preview" })).toBeVisible();
    expect(screen.getAllByText("ATS Metadata").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("heading", { name: "Deterministic resume signals" })).toBeVisible();
    expect(screen.getAllByText("Metadata ready").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Not scored")).toBeVisible();
    expect(screen.getByText("Section presence")).toBeVisible();
    expect(screen.getByText("Formatting risk indicator")).toBeVisible();
    expect(screen.getByText("Keyword coverage placeholder")).toBeVisible();
    expect(screen.getAllByText("Warning").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Info")).toBeVisible();
    expect(screen.queryByText(/ATS score/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ready for ATS/i)).not.toBeInTheDocument();
    expect(screen.getByText("Skill Signals Metadata")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Explicit skill mentions" })).toBeVisible();
    expect(screen.getByText("Signals detected")).toBeVisible();
    expect(screen.getByText("Explicit signals")).toBeVisible();
    expect(screen.getByText("3")).toBeVisible();
    expect(screen.getAllByText("Python").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("FastAPI").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("PostgreSQL").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Programming language")).toBeVisible();
    expect(screen.getByText("Framework")).toBeVisible();
    expect(screen.getByText("Database")).toBeVisible();
    expect(screen.getAllByText("Source area").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Skills").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("Evidence line").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Matched text").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/rank/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/advice/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Deterministic internship role candidates" }),
    ).toBeVisible();
    expect(screen.getByText("Backend Developer Intern")).toBeVisible();
    expect(screen.getByText("Frontend Developer Intern")).toBeVisible();
    expect(screen.getByText("Full Stack Developer Intern")).toBeVisible();
    expect(screen.getByText("Data Analyst Intern")).toBeVisible();
    expect(screen.getByText("Machine Learning Intern")).toBeVisible();
    expect(screen.getAllByText("Partial metadata")).toHaveLength(5);
    expect(screen.getAllByText("Confidence state")).toHaveLength(5);
    expect(screen.getAllByText("Metadata ready").length).toBeGreaterThanOrEqual(6);
    expect(screen.getAllByText("Matched skill signals")).toHaveLength(5);
    expect(screen.getAllByText("Missing required signals")).toHaveLength(5);
    expect(screen.getAllByText("SQL").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("CSS")).toBeVisible();
    expect(screen.queryByText(/recommended/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/best match/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/you should become/i)).not.toBeInTheDocument();
    expect(screen.getByText("Analysis workflow metadata available")).toBeVisible();
    expectValidAriaIdReferences();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("keeps dashboard headings and navigation landmarks accessible", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(createUploadSuccessResponse());

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(await screen.findByRole("heading", { name: "Resume upload accepted" })).toBeVisible();

    const dashboardNavigation = screen.getByRole("navigation", {
      name: "Analysis dashboard sections",
    });
    const headingLevels = screen
      .getAllByRole("heading")
      .map((heading) => Number(heading.tagName.replace("H", "")));

    headingLevels.reduce((previousLevel, currentLevel) => {
      expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
      return currentLevel;
    });

    [
      ["Resume Intake", "resume-intake-title"],
      ["Resume Structure", "resume-structure-title"],
      ["Skill Signals", "skill-signals-title"],
      ["ATS Metadata", "ats-feedback-title"],
      ["Role Matching", "role-matches-title"],
    ].forEach(([linkName, targetId]) => {
      const link = within(dashboardNavigation).getByRole("link", { name: linkName });

      expect(link).toHaveAttribute("href", `#${targetId}`);
      expect(document.getElementById(targetId)).not.toBeNull();
    });
  });

  it("shows a neutral unavailable state when ATS feedback metadata is absent", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify(
          createSuccessfulUploadResponse(undefined, undefined, LONG_EXTRACTED_TEXT, {
            status: "not_started",
            name: "ats",
            label: "ATS analysis",
          }),
        ),
        {
          headers: { "Content-Type": "application/json" },
          status: 202,
        },
      ),
    );

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(await screen.findByRole("heading", { name: "Resume upload accepted" })).toBeVisible();
    expect(screen.getByText("ATS feedback metadata unavailable.")).toBeVisible();
  });

  it("shows a neutral unavailable state when skill signal metadata is absent", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify(
          createSuccessfulUploadResponse(undefined, undefined, LONG_EXTRACTED_TEXT, undefined, {
            status: "not_started",
            name: "skills",
            label: "Skill extraction",
          }),
        ),
        {
          headers: { "Content-Type": "application/json" },
          status: 202,
        },
      ),
    );

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(await screen.findByRole("heading", { name: "Resume upload accepted" })).toBeVisible();
    expect(screen.getByText("Skill signal metadata unavailable.")).toBeVisible();
  });

  it("shows a neutral empty state when no explicit skill signals are detected", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify(
          createSuccessfulUploadResponse(undefined, undefined, LONG_EXTRACTED_TEXT, undefined, {
            status: "no_signals",
            source: "deterministic_normalized_text",
            signals: [],
          }),
        ),
        {
          headers: { "Content-Type": "application/json" },
          status: 202,
        },
      ),
    );

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(await screen.findByRole("heading", { name: "Resume upload accepted" })).toBeVisible();
    expect(screen.getByText("No signals")).toBeVisible();
    expect(screen.getByText("No explicit skill signals available.")).toBeVisible();
  });

  it("shows a neutral unavailable state when role matching metadata is absent", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify(
          createSuccessfulUploadResponse(
            undefined,
            undefined,
            LONG_EXTRACTED_TEXT,
            undefined,
            undefined,
            {
              status: "not_started",
              name: "roles",
              label: "Role matching",
            },
          ),
        ),
        {
          headers: { "Content-Type": "application/json" },
          status: 202,
        },
      ),
    );

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(await screen.findByRole("heading", { name: "Resume upload accepted" })).toBeVisible();
    expect(screen.getByText("Role matching metadata unavailable.")).toBeVisible();
  });

  it("shows a neutral unavailable state when role candidates are absent", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify(
          createSuccessfulUploadResponse(
            undefined,
            undefined,
            LONG_EXTRACTED_TEXT,
            undefined,
            undefined,
            {
              status: "not_evaluated",
              source: "deterministic_resume_metadata",
              candidates: [],
            },
          ),
        ),
        {
          headers: { "Content-Type": "application/json" },
          status: 202,
        },
      ),
    );

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(await screen.findByRole("heading", { name: "Resume upload accepted" })).toBeVisible();
    expect(screen.getByText("Role matching metadata unavailable.")).toBeVisible();
  });

  it("shows factual summary fallback states when metadata is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify(
          createSuccessfulUploadResponse(
            null,
            [],
            LONG_EXTRACTED_TEXT,
            {
              status: "not_started",
              name: "ats",
              label: "ATS analysis",
            },
            {
              status: "not_started",
              name: "skills",
              label: "Skill extraction",
            },
            {
              status: "not_started",
              name: "roles",
              label: "Role matching",
            },
          ),
        ),
        {
          headers: { "Content-Type": "application/json" },
          status: 202,
        },
      ),
    );

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(await screen.findByRole("heading", { name: "Resume upload accepted" })).toBeVisible();
    const summaryPanel = screen.getByLabelText("Deterministic pipeline overview");

    expect(within(summaryPanel).getByText("Accepted")).toBeVisible();
    expect(within(summaryPanel).getByText("Extracted")).toBeVisible();
    expect(within(summaryPanel).getByText("0 detected")).toBeVisible();
    expect(within(summaryPanel).getAllByText("Unavailable").length).toBeGreaterThanOrEqual(4);
    expect(within(summaryPanel).getByText("Deterministic pipeline incomplete")).toBeVisible();
    expect(summaryPanel).not.toHaveTextContent(/recommended/i);
    expect(summaryPanel).not.toHaveTextContent(/suitable/i);
    expect(summaryPanel).not.toHaveTextContent(/strong/i);
    expect(summaryPanel).not.toHaveTextContent(/weak/i);
    expect(summaryPanel).not.toHaveTextContent(/good/i);
    expect(summaryPanel).not.toHaveTextContent(/bad/i);
    expect(summaryPanel).not.toHaveTextContent(/ready/i);
  });

  it("expands and collapses long extracted text preview", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(createSuccessfulUploadResponse()), {
        headers: { "Content-Type": "application/json" },
        status: 202,
      }),
    );

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(await screen.findByRole("button", { name: "Expand preview" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Expand preview" })).toHaveAttribute(
      "aria-controls",
      "text-preview-content",
    );
    expect(screen.getByRole("button", { name: "Expand preview" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(document.getElementById("text-preview-content")).not.toBeNull();
    expect(screen.queryByText(/recruiter-demo-ready upload results/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand preview" }));

    expect(screen.getByRole("button", { name: "Collapse preview" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Collapse preview" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText(/recruiter-demo-ready upload results/)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Collapse preview" }));

    expect(screen.getByRole("button", { name: "Expand preview" })).toBeVisible();
    expect(screen.queryByText(/recruiter-demo-ready upload results/)).not.toBeInTheDocument();
  });

  it("shows a neutral unavailable state when extracted text is absent", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(createSuccessfulUploadResponse(undefined, undefined, "")), {
        headers: { "Content-Type": "application/json" },
        status: 202,
      }),
    );

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(await screen.findByRole("heading", { name: "Resume upload accepted" })).toBeVisible();
    expect(screen.getByText("Extracted text preview unavailable.")).toBeVisible();
  });

  it("shows a neutral unavailable state when detected sections are absent", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(createSuccessfulUploadResponse(undefined, [])), {
        headers: { "Content-Type": "application/json" },
        status: 202,
      }),
    );

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(await screen.findByRole("heading", { name: "Resume upload accepted" })).toBeVisible();
    expect(screen.getByText("No detected section details available.")).toBeVisible();
  });

  it("shows a neutral unavailable state when completeness metadata is absent", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(createSuccessfulUploadResponse(null)), {
        headers: { "Content-Type": "application/json" },
        status: 202,
      }),
    );

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(await screen.findByRole("heading", { name: "Resume upload accepted" })).toBeVisible();
    expect(screen.getByText("Completeness metadata unavailable.")).toBeVisible();
  });
});
