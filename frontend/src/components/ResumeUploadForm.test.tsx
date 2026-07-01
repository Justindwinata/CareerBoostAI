import { fireEvent, render, screen } from "@testing-library/react";

import { ResumeUploadForm } from "./ResumeUploadForm";

function createPdfFile(name = "resume.pdf") {
  return new File(["%PDF-1.7"], name, { type: "application/pdf" });
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
      character_count: 148,
      page_count: 1,
      extracted_text:
        "Justin Dwinata Software Engineer Internship Resume Python React FastAPI TypeScript PostgreSQL Projects Education Experience Skills Portfolio Backend Frontend Testing",
      normalized_text:
        "Justin Dwinata Software Engineer Internship Resume Python React FastAPI TypeScript PostgreSQL Projects Education Experience Skills Portfolio Backend Frontend Testing",
      sections,
      error: null,
    },
    completeness,
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
  };
}

describe("ResumeUploadForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(screen.getByText("resume.pdf")).toBeVisible();
    expect(screen.getByText("2.0 KB")).toBeVisible();
    expect(screen.getByText("Accepted PDF resume")).toBeVisible();
    expect(screen.getByText("Text extraction complete")).toBeVisible();
    expect(screen.getByText("Medium confidence")).toBeVisible();
    expect(screen.getByText("148 readable characters")).toBeVisible();
    expect(screen.getByText("1")).toBeVisible();
    expect(screen.getByText("Completeness Baseline")).toBeVisible();
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
    expect(screen.getByText("Ready for analysis workflow")).toBeVisible();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
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

  it("rejects non-PDF files before submitting", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const textFile = new File(["resume"], "resume.txt", { type: "text/plain" });

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [textFile] },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Upload a PDF resume file. Other file types are not supported yet.",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects empty files before submitting", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const emptyFile = new File([], "resume.pdf", { type: "application/pdf" });

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [emptyFile] },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The selected file is empty. Choose a PDF resume that contains content.",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects oversized files before submitting", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const oversizedFile = new File(["0".repeat(5 * 1024 * 1024 + 1)], "resume.pdf", {
      type: "application/pdf",
    });

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [oversizedFile] },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your resume is larger than 5 MB. Compress the PDF and try again.",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows password-protected PDF errors from the backend", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Password-protected PDFs are not supported." }), {
        headers: { "Content-Type": "application/json" },
        status: 422,
      }),
    );

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile("locked.pdf")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Remove the PDF password protection and upload the resume again.",
    );
  });

  it("shows invalid PDF errors from the backend", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Resume file is not a valid PDF." }), {
        headers: { "Content-Type": "application/json" },
        status: 422,
      }),
    );

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [createPdfFile("invalid.pdf")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload resume" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This file could not be read as a valid PDF. Export your resume as a new PDF and try again.",
    );
  });

  it("shows low-text extraction errors from the backend", async () => {
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

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The PDF does not contain enough readable text. Upload a text-based resume PDF instead of a scanned or blank file.",
    );
  });
});
