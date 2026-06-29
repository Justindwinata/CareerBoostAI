import { render, screen } from "@testing-library/react";

import { SystemStatus } from "./SystemStatus";

describe("SystemStatus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders healthy backend status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "ok",
          service: "CareerBoost AI API",
          version: "0.1.0",
          environment: "development",
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      ),
    );

    render(<SystemStatus />);

    expect(await screen.findByText("CareerBoost AI API is healthy in development")).toBeVisible();
  });

  it("renders unavailable status when the health request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network unavailable"));

    render(<SystemStatus />);

    expect(await screen.findByText("Backend health unavailable")).toBeVisible();
  });
});
