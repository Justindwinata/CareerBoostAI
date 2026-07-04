import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { App } from "./App";

function renderRoute(path: string) {
  window.history.pushState({}, "", path);

  return render(<App />);
}

function createHistoryResponse(records: unknown[]) {
  return new Response(JSON.stringify(records), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

function createHealthResponse() {
  return new Response(
    JSON.stringify({ status: "ok", service: "CareerBoost API", environment: "test" }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
    },
  );
}

function mockHistoryFetch(...historyResponses: Array<Response | Promise<Response>>) {
  const responses = [...historyResponses];

  return vi.spyOn(globalThis, "fetch").mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith("/health")) {
      return Promise.resolve(createHealthResponse());
    }

    const response = responses.shift();

    if (!response) {
      return Promise.reject(new Error(`Unexpected fetch request: ${url}`));
    }

    return Promise.resolve(response);
  });
}

function createHistoryRecord(overrides: Record<string, unknown> = {}) {
  return {
    analysis_id: "11111111-1111-4111-8111-111111111111",
    created_at: "2026-07-04T10:30:00+00:00",
    filename: "resume.pdf",
    target_role: "Frontend Developer Intern",
    target_criteria_status: "provided",
    target_alignment_status: "evaluated",
    detected_section_count: 4,
    skill_signal_count: 7,
    role_profile_count: 5,
    ...overrides,
  };
}

function createStoredAnalysisResponse(overrides: Record<string, unknown> = {}) {
  return {
    analysis_id: "11111111-1111-4111-8111-111111111111",
    status: "intake_completed",
    intake: {
      status: "accepted",
      filename: "resume.pdf",
      content_type: "application/pdf",
      size_bytes: 2048,
    },
    extraction: {
      status: "extracted",
      confidence: "high",
      character_count: 640,
      page_count: 1,
      extracted_text:
        "Alex Morgan\nProfessional Summary\nFrontend developer intern candidate\nTechnical Skills\nReact, TypeScript, Python\nProjects\nCareerBoost AI",
      normalized_text:
        "Alex Morgan\nProfessional Summary\nFrontend developer intern candidate\nTechnical Skills\nReact, TypeScript, Python\nProjects\nCareerBoost AI",
      sections: [
        {
          name: "summary",
          heading: "Professional Summary",
          start_line: 2,
          end_line: 3,
          content: "Frontend developer intern candidate",
        },
        {
          name: "skills",
          heading: "Technical Skills",
          start_line: 4,
          end_line: 5,
          content: "React, TypeScript, Python",
        },
        {
          name: "projects",
          heading: "Projects",
          start_line: 6,
          end_line: 7,
          content: "CareerBoost AI",
        },
      ],
      quality_warnings: [],
      error: null,
    },
    completeness: {
      expected_sections: ["summary", "skills", "experience", "education", "projects"],
      present_sections: ["summary", "skills", "projects"],
      missing_sections: ["experience", "education"],
      score: 0.6,
    },
    target_criteria: {
      status: "provided",
      target_role: "Frontend Developer Intern",
      target_description: "Build user-facing React interfaces.",
      required_skills: ["React", "TypeScript", "GraphQL"],
      preferred_skills: ["Docker"],
      required_sections: ["summary", "skills", "projects"],
      analysis_priorities: ["resume_structure", "skill_visibility", "role_alignment"],
      experience_expectation: "Internship level",
      education_expectation: "Computer Science preferred",
      notes: "",
    },
    target_alignment: {
      status: "evaluated",
      summary: {
        required_skills_total: 3,
        required_skills_found: 2,
        required_skills_missing: 1,
        preferred_skills_total: 1,
        preferred_skills_found: 0,
        required_sections_total: 3,
        required_sections_found: 3,
        required_sections_missing: 0,
        priorities_total: 3,
        priorities_evaluated: 3,
      },
      required_skills: [
        {
          category: "required",
          submitted_skill: "React",
          normalized_skill: "react",
          status: "found",
          evidence: [
            {
              source_type: "explicit_skill_signal",
              source_label: "React",
              source_area: "skills",
              line_number: 5,
              detail: "React was explicitly detected.",
            },
          ],
        },
        {
          category: "required",
          submitted_skill: "GraphQL",
          normalized_skill: "graphql",
          status: "not_found",
          evidence: [],
        },
      ],
      preferred_skills: [
        {
          category: "preferred",
          submitted_skill: "Docker",
          normalized_skill: "docker",
          status: "not_found",
          evidence: [],
        },
      ],
      required_sections: [
        {
          section: "summary",
          display_label: "Summary",
          status: "detected",
          evidence: [
            {
              source_type: "detected_resume_section",
              source_label: "Professional Summary",
              source_area: "summary",
              line_number: 2,
              detail: "Summary section was detected.",
            },
          ],
        },
      ],
      analysis_priorities: [
        {
          priority: "skill_visibility",
          display_label: "Skill visibility",
          status: "evaluated",
          evidence: [
            {
              source_type: "metadata_available",
              source_label: "Skill Signals",
              source_area: "skills",
              line_number: null,
              detail: "Skill signal metadata was available.",
            },
          ],
        },
      ],
      target_role: {
        status: "mapped_to_controlled_profile",
        target_role: "Frontend Developer Intern",
        controlled_profile: "Frontend Developer Intern",
        evidence: [
          {
            source_type: "controlled_role_profile",
            source_label: "Frontend Developer Intern",
            source_area: "document",
            line_number: null,
            detail: "Target role matched a controlled profile.",
          },
        ],
      },
      message: "Target alignment metadata was evaluated.",
    },
    ats: {
      status: "metadata_ready",
      source: "deterministic_resume_signals",
      issues: [
        {
          category: "section_presence",
          severity: "warning",
          title: "Education section was not detected",
          description: "Expected section metadata was missing.",
          observed_signal: "education_missing",
          related_sections: ["education"],
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
    skills: {
      status: "signals_detected",
      source: "deterministic_normalized_text",
      signals: [
        {
          name: "React",
          category: "framework",
          evidence_level: "explicit_mention",
          evidence: [
            {
              matched_text: "React",
              source_area: "skills",
              line_number: 5,
              evidence_text: "React, TypeScript, Python",
            },
          ],
        },
        {
          name: "TypeScript",
          category: "programming_language",
          evidence_level: "explicit_mention",
          evidence: [
            {
              matched_text: "TypeScript",
              source_area: "skills",
              line_number: 5,
              evidence_text: "React, TypeScript, Python",
            },
          ],
        },
      ],
    },
    roles: {
      status: "metadata_ready",
      source: "deterministic_resume_metadata",
      candidates: [
        {
          role_name: "Frontend Developer Intern",
          match_status: "partial_match",
          confidence_state: "metadata_ready",
          deterministic_evidence: ["Explicit React signal found"],
          matched_skill_signals: ["React", "TypeScript"],
          missing_required_signals: ["JavaScript"],
          supporting_sections: ["skills", "projects"],
        },
      ],
    },
    recommendations: {
      status: "recommendations_ready",
      source: "deterministic_analysis_metadata",
      items: [
        {
          identifier: "target-required-skill-missing-graphql",
          category: "skill_visibility",
          title: "Explicitly mention GraphQL if it is relevant",
          description:
            "The submitted target criteria include GraphQL, but the extracted resume evidence does not explicitly show that skill.",
          priority: "high",
          evidence: [
            {
              source_type: "target_alignment_metadata",
              source_id: "required_skill:graphql",
              summary: "Required target skill not found: GraphQL.",
            },
          ],
          source_metadata: {
            pipeline_stage: "target_alignment",
            signal: "required_skill:not_found:graphql",
          },
          actionable_next_step:
            "If accurate, explicitly mention GraphQL in a skills, project, or experience bullet.",
          boundary_note: "This guidance does not infer whether the candidate has the skill.",
        },
        {
          identifier: "role-signal-gap-frontend-developer-intern-javascript",
          category: "role_signal_gap",
          title: "Clarify role signal for Frontend Developer Intern",
          description:
            "This resume does not explicitly show evidence for this role signal: JavaScript.",
          priority: "medium",
          evidence: [
            {
              source_type: "missing_role_signal",
              source_id: "Frontend Developer Intern:JavaScript",
              summary: "Missing required signal for Frontend Developer Intern: JavaScript.",
            },
          ],
          source_metadata: {
            pipeline_stage: "role_matching",
            signal: "missing_role_signal:Frontend Developer Intern:JavaScript",
          },
          actionable_next_step:
            "If accurate, explicitly mention JavaScript in relevant skills, project, or experience evidence.",
          boundary_note: "Role metadata is deterministic and does not rank candidate fit.",
        },
        {
          identifier: "target-preferred-skill-missing-docker",
          category: "skill_visibility",
          title: "Clarify optional evidence for Docker",
          description:
            "The preferred target criteria include Docker, but the extracted resume evidence does not explicitly show it.",
          priority: "low",
          evidence: [
            {
              source_type: "target_alignment_metadata",
              source_id: "preferred_skill:docker",
              summary: "Preferred target skill not found: Docker.",
            },
          ],
          source_metadata: {
            pipeline_stage: "target_alignment",
            signal: "preferred_skill:not_found:docker",
          },
          actionable_next_step: "If relevant, consider adding explicit evidence for Docker.",
          boundary_note: "Preferred criteria are optional context, not required gaps.",
        },
      ],
    },
    ...overrides,
  };
}

function getPrimaryNavigation() {
  return screen.getByRole("navigation", { name: "Primary navigation" });
}

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.history.pushState({}, "", "/");
  });

  it("renders the Home route with deterministic product capabilities", () => {
    renderRoute("/");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Review resume evidence before an application.",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Analyze a Resume" })).toHaveAttribute(
      "href",
      "/upload",
    );
    expect(screen.getByText("PDF validation")).toBeVisible();
    expect(screen.getByText("Deterministic role matching")).toBeVisible();
    expect(screen.getByRole("heading", { name: "No saved analyses yet" })).toBeVisible();
    expect(
      screen.getByText("History storage will be introduced in a future update."),
    ).toBeVisible();
  });

  it("renders the Upload CV route with the existing upload workflow", () => {
    renderRoute("/upload");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Upload a resume for deterministic analysis.",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", {
        name: "Define the target role before analyzing a resume.",
      }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Upload a PDF resume" })).toBeVisible();
    expect(screen.getByRole("form", { name: "Resume upload form" })).toBeVisible();
    expect(screen.getByLabelText("Select PDF resume")).toBeVisible();
  });

  it("renders a loading state while history is fetched", () => {
    mockHistoryFetch(new Promise<Response>(() => {}));

    renderRoute("/history");

    expect(screen.getByRole("heading", { level: 1, name: "Saved resume analyses" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Loading saved analyses" })).toBeVisible();
    expect(
      screen.getByText("CareerBoost AI is reading locally stored analysis summaries."),
    ).toBeVisible();
  });

  it("renders an honest History route empty state without records", async () => {
    mockHistoryFetch(createHistoryResponse([]));

    renderRoute("/history");

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Saved resume analyses",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Upload and analyze a resume to create your first history record."),
    ).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("Sample analysis")).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("main")).getAllByRole("link", { name: "Upload CV" })[0],
    ).toHaveAttribute("href", "/upload");
  });

  it("fetches and renders saved analysis summaries", async () => {
    mockHistoryFetch(
      createHistoryResponse([
        createHistoryRecord(),
        createHistoryRecord({
          analysis_id: "22222222-2222-4222-8222-222222222222",
          filename: "backend-resume.pdf",
          target_role: "",
          target_criteria_status: "not_provided",
          target_alignment_status: "not_provided",
          detected_section_count: 2,
          skill_signal_count: 3,
        }),
      ]),
    );

    renderRoute("/history");

    expect(await screen.findByRole("heading", { name: "Analysis summaries" })).toBeVisible();
    expect(screen.getByText("resume.pdf")).toBeVisible();
    expect(screen.getByText("backend-resume.pdf")).toBeVisible();
    expect(screen.getAllByText("Frontend Developer Intern").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Not provided")).toBeVisible();
    expect(screen.getByText("11111111...1111")).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Open result" })[0]).toHaveAttribute(
      "href",
      "/results/11111111-1111-4111-8111-111111111111",
    );
    expect(screen.queryByText("Sample analysis")).not.toBeInTheDocument();
    expect(screen.queryByText("Download report")).not.toBeInTheDocument();
    expect(screen.queryByText(/hiring prediction/i)).not.toBeInTheDocument();
  });

  it("renders a safe backend error state and retries loading history", async () => {
    const fetchSpy = mockHistoryFetch(
      new Response(JSON.stringify({ detail: "Analysis history storage is unavailable." }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }),
      createHistoryResponse([]),
    );

    renderRoute("/history");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Analysis history is unavailable. Check the backend connection and try again.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry loading history" }));

    expect(await screen.findByRole("heading", { name: "No saved analyses yet" })).toBeVisible();
    expect(fetchSpy).toHaveBeenCalledWith("http://localhost:8000/analyses?limit=20&offset=0");
  });

  it("refreshes the history list on demand", async () => {
    const fetchSpy = mockHistoryFetch(
      createHistoryResponse([]),
      createHistoryResponse([createHistoryRecord()]),
    );

    renderRoute("/history");

    expect(await screen.findByRole("heading", { name: "No saved analyses yet" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Refresh history" }));

    expect(await screen.findByText("resume.pdf")).toBeVisible();
    expect(fetchSpy).toHaveBeenCalledWith("http://localhost:8000/analyses?limit=20&offset=0");
  });

  it("confirms delete and removes the saved analysis after success", async () => {
    const fetchSpy = mockHistoryFetch(
      createHistoryResponse([createHistoryRecord()]),
      new Response(JSON.stringify({ detail: "Analysis record deleted." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );

    renderRoute("/history");

    expect(await screen.findByText("resume.pdf")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByText("resume.pdf")).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "No saved analyses yet" })).toBeVisible();
    expect(fetchSpy).toHaveBeenLastCalledWith(
      "http://localhost:8000/analyses/11111111-1111-4111-8111-111111111111",
      { method: "DELETE" },
    );
  });

  it("keeps the saved analysis visible when delete fails", async () => {
    mockHistoryFetch(
      createHistoryResponse([createHistoryRecord()]),
      new Response(JSON.stringify({ detail: "Analysis record was not found." }), {
        headers: { "Content-Type": "application/json" },
        status: 404,
      }),
    );
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );

    renderRoute("/history");

    expect(await screen.findByText("resume.pdf")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The selected analysis record was not found. Refresh the history list and try again.",
    );
    expect(screen.getByText("resume.pdf")).toBeVisible();
  });

  it("renders a loading state while a saved analysis result is fetched", () => {
    mockHistoryFetch(new Promise<Response>(() => {}));

    renderRoute("/results/11111111-1111-4111-8111-111111111111");

    expect(screen.getByRole("heading", { level: 1, name: "Analysis Result" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Loading saved analysis" })).toBeVisible();
    expect(
      screen.getByText("CareerBoost AI is reading the stored deterministic analysis response."),
    ).toBeVisible();
  });

  it("fetches and renders a stored analysis result dashboard", async () => {
    mockHistoryFetch(
      new Response(JSON.stringify(createStoredAnalysisResponse()), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    renderRoute("/results/11111111-1111-4111-8111-111111111111");

    expect(await screen.findByRole("heading", { name: "Stored analysis result" })).toBeVisible();
    expect(screen.getAllByText("resume.pdf").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("11111111...1111")).toBeVisible();
    expect(screen.getByText("Unavailable in stored detail response")).toBeVisible();
    expect(screen.getAllByText("Frontend Developer Intern").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: "Application Target" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Target Alignment" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Resume Intake" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Resume Structure" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Improvement Guidance" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Skill Signals" })).toBeVisible();
    expect(screen.getByRole("link", { name: "ATS Metadata" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Role Matching" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Target criteria metadata" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Evidence-backed alignment metadata" }),
    ).toBeVisible();
    expect(screen.getAllByText("React").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("GraphQL")).toBeVisible();
    expect(screen.queryByText("Extraction quality advisory")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Evidence-backed improvement opportunities" }),
    ).toBeVisible();
    expect(screen.getAllByText("Guidance available").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("High priority").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Medium priority").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Low priority").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Explicitly mention GraphQL if it is relevant")).toBeVisible();
    expect(screen.getByText("Required target skill not found: GraphQL.")).toBeVisible();
    expect(
      screen.getByText(
        "If accurate, explicitly mention GraphQL in a skills, project, or experience bullet.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Download HTML Report" })).toBeVisible();
    expect(screen.queryByText(/hiring prediction/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/guaranteed/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Back to History" })[0]).toHaveAttribute(
      "href",
      "/history",
    );
    expect(screen.getByRole("link", { name: "Analyze Another Resume" })).toHaveAttribute(
      "href",
      "/upload",
    );
  });

  it("renders recommendation fallback states for saved analyses", async () => {
    mockHistoryFetch(
      new Response(
        JSON.stringify(
          createStoredAnalysisResponse({
            recommendations: {
              status: "no_recommendations",
              source: "deterministic_analysis_metadata",
              items: [],
            },
          }),
        ),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      ),
    );

    renderRoute("/results/11111111-1111-4111-8111-111111111111");

    expect(await screen.findByRole("heading", { name: "Stored analysis result" })).toBeVisible();
    expect(
      screen.getByText("No deterministic improvement guidance was generated for this analysis."),
    ).toBeVisible();
  });

  it("renders a missing recommendation field fallback for older saved analyses", async () => {
    const storedAnalysis: Record<string, unknown> = createStoredAnalysisResponse();
    delete storedAnalysis.recommendations;
    mockHistoryFetch(
      new Response(JSON.stringify(storedAnalysis), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    renderRoute("/results/11111111-1111-4111-8111-111111111111");

    expect(await screen.findByRole("heading", { name: "Stored analysis result" })).toBeVisible();
    expect(
      screen.getByText("Improvement guidance was not available for this saved analysis."),
    ).toBeVisible();
  });

  it("renders extraction quality advisories without unsafe claims", async () => {
    const storedAnalysis = createStoredAnalysisResponse();
    storedAnalysis.extraction = {
      ...storedAnalysis.extraction,
      quality_warnings: [
        {
          category: "unusual_section_order",
          message:
            "Some resume sections may have been extracted in an unusual order. Consider using a simpler single-column ATS-friendly layout if the analysis looks incomplete.",
        },
      ],
    };
    storedAnalysis.recommendations = {
      status: "recommendations_ready",
      source: "deterministic_analysis_metadata",
      items: [
        {
          identifier: "document-quality-unusual_section_order",
          category: "document_quality",
          title: "Review extraction quality advisory",
          description:
            "Some resume sections may have been extracted in an unusual order. Consider using a simpler single-column ATS-friendly layout if the analysis looks incomplete.",
          priority: "medium",
          evidence: [
            {
              source_type: "extraction_quality_metadata",
              source_id: "warning:unusual_section_order",
              summary: "Extraction warning: unusual_section_order.",
            },
          ],
          source_metadata: {
            pipeline_stage: "extraction",
            signal: "quality_warning:unusual_section_order",
          },
          actionable_next_step:
            "Consider using a simpler single-column ATS-friendly layout if the analysis output looks incomplete.",
          boundary_note: "This warning does not block analysis or invalidate the resume.",
        },
      ],
    };
    mockHistoryFetch(
      new Response(JSON.stringify(storedAnalysis), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    renderRoute("/results/11111111-1111-4111-8111-111111111111");

    expect(await screen.findByRole("heading", { name: "Stored analysis result" })).toBeVisible();
    expect(screen.getByText("Parsing warnings")).toBeVisible();
    expect(screen.getByText("1 advisory")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Extraction quality advisory" })).toBeVisible();
    expect(screen.getAllByText(/unusual order/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Review extraction quality advisory")).toBeVisible();
    expect(screen.getByText("Extraction warning: unusual_section_order.")).toBeVisible();
    expect(screen.queryByText(/guaranteed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/hiring prediction/i)).not.toBeInTheDocument();
  });

  it("renders a safe not-found state for unknown analysis results", async () => {
    mockHistoryFetch(
      new Response(JSON.stringify({ detail: "Analysis record was not found." }), {
        headers: { "Content-Type": "application/json" },
        status: 404,
      }),
    );

    renderRoute("/results/demo-analysis-id");

    expect(await screen.findByRole("heading", { name: "Analysis not found" })).toBeVisible();
    expect(
      screen.getByText("This saved analysis may have been deleted or the ID may be invalid."),
    ).toBeVisible();
    expect(screen.getByText("demo-analysis-id")).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Back to History" })[0]).toHaveAttribute(
      "href",
      "/history",
    );
    expect(screen.getAllByRole("link", { name: "Upload CV" })[0]).toHaveAttribute(
      "href",
      "/upload",
    );
    expect(screen.queryByText("Analysis Summary")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download HTML Report" })).not.toBeInTheDocument();
  });

  it("renders a safe result error state and retries loading the saved analysis", async () => {
    const fetchSpy = mockHistoryFetch(
      new Response(JSON.stringify({ detail: "Analysis history storage is unavailable." }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }),
      new Response(JSON.stringify(createStoredAnalysisResponse()), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    renderRoute("/results/11111111-1111-4111-8111-111111111111");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Saved analysis could not be loaded. Check the backend connection and try again.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry loading result" }));

    expect(await screen.findByRole("heading", { name: "Stored analysis result" })).toBeVisible();
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:8000/analyses/11111111-1111-4111-8111-111111111111",
    );
  });

  it("downloads a standalone HTML report from a loaded result", async () => {
    const createObjectUrl = vi.fn(() => "blob:careerboost-report");
    const revokeObjectUrl = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.stubGlobal(
      "URL",
      Object.assign(URL, { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl }),
    );
    const fetchSpy = mockHistoryFetch(
      new Response(JSON.stringify(createStoredAnalysisResponse()), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
      new Response("<!doctype html><html><body>Report</body></html>", {
        headers: { "Content-Type": "text/html" },
        status: 200,
      }),
    );

    renderRoute("/results/11111111-1111-4111-8111-111111111111");

    const downloadButton = await screen.findByRole("button", { name: "Download HTML Report" });
    fireEvent.click(downloadButton);

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenLastCalledWith(
        "http://localhost:8000/analyses/11111111-1111-4111-8111-111111111111/report.html",
      ),
    );
    expect(createObjectUrl).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:careerboost-report");
  });

  it("disables the report download action while a download is in progress", async () => {
    mockHistoryFetch(
      new Response(JSON.stringify(createStoredAnalysisResponse()), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
      new Promise<Response>(() => {}),
    );

    renderRoute("/results/11111111-1111-4111-8111-111111111111");

    const downloadButton = await screen.findByRole("button", { name: "Download HTML Report" });
    fireEvent.click(downloadButton);

    expect(
      await screen.findByText("Preparing standalone HTML report download."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Downloading HTML Report" })).toBeDisabled();
  });

  it("renders a safe report download error", async () => {
    mockHistoryFetch(
      new Response(JSON.stringify(createStoredAnalysisResponse()), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
      new Response(JSON.stringify({ detail: "Analysis history storage is unavailable." }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }),
    );

    renderRoute("/results/11111111-1111-4111-8111-111111111111");

    fireEvent.click(await screen.findByRole("button", { name: "Download HTML Report" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "HTML report could not be downloaded",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Check the backend connection and try again from this saved result.",
    );
  });

  it("renders an accessible not-found route", () => {
    renderRoute("/missing-route");

    expect(
      screen.getByRole("heading", { level: 1, name: "This page is not available." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go Home" })).toHaveAttribute("href", "/");
    expect(
      within(screen.getByRole("main")).getByRole("link", { name: "Upload CV" }),
    ).toHaveAttribute("href", "/upload");
  });

  it("exposes accessible primary navigation and active route state", () => {
    renderRoute("/upload");

    const navigation = getPrimaryNavigation();

    expect(within(navigation).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(within(navigation).getByRole("link", { name: "Upload CV" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(navigation).getByRole("link", { name: "History" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("updates route headings through primary navigation", () => {
    renderRoute("/");

    const navigation = getPrimaryNavigation();
    fireEvent.click(within(navigation).getByRole("link", { name: "Upload CV" }));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Upload a resume for deterministic analysis.",
      }),
    ).toBeInTheDocument();
    expect(within(getPrimaryNavigation()).getByRole("link", { name: "Upload CV" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(document.title).toBe("Upload CV | CareerBoost AI");
  });
});
