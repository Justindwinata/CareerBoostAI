import { fireEvent, render, screen, within } from "@testing-library/react";

import { App } from "./App";

function renderRoute(path: string) {
  window.history.pushState({}, "", path);
  vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise<Response>(() => {}));

  return render(<App />);
}

function getPrimaryNavigation() {
  return screen.getByRole("navigation", { name: "Primary navigation" });
}

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(screen.getByRole("heading", { name: "Upload a PDF resume" })).toBeVisible();
    expect(screen.getByRole("form", { name: "Resume upload form" })).toBeVisible();
    expect(screen.getByLabelText("Select PDF resume")).toBeVisible();
  });

  it("renders an honest History route empty state without records", () => {
    renderRoute("/history");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Saved analysis history is not available yet.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Analyses are not currently persisted in this local version."),
    ).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("Sample analysis")).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("main")).getByRole("link", { name: "Upload CV" }),
    ).toHaveAttribute("href", "/upload");
  });

  it("renders a safe unavailable state for unknown analysis results", () => {
    renderRoute("/results/demo-analysis-id");

    expect(
      screen.getByRole("heading", { level: 1, name: "Analysis result unavailable." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Persisted result retrieval is not implemented yet, so CareerBoost AI cannot load saved analysis records from this route.",
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
