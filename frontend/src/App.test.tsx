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
    expect(screen.getByText("Frontend Developer Intern")).toBeVisible();
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

  it("renders a safe unavailable state for unknown analysis results", () => {
    renderRoute("/results/demo-analysis-id");

    expect(
      screen.getByRole("heading", { level: 1, name: "Analysis result unavailable." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Backend result retrieval exists, but this frontend route is not connected to stored analysis records yet.",
      ),
    ).toBeVisible();
    expect(screen.getByText("demo-analysis-id")).toBeVisible();
    expect(
      within(screen.getByRole("main")).getByRole("link", { name: "Upload CV" }),
    ).toHaveAttribute("href", "/upload");
    expect(screen.getByRole("link", { name: "View History" })).toHaveAttribute("href", "/history");
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
