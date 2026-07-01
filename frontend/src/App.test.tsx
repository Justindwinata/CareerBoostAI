import { render, screen } from "@testing-library/react";

import { App } from "./App";

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the engineering foundation shell", () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("backend unavailable"));

    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: "Engineering foundation is running.",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Upload a PDF resume" })).toBeInTheDocument();
  });
});
