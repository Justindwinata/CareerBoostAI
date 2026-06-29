import { render, screen } from "@testing-library/react";

import { App } from "./App";

describe("App", () => {
  it("renders the engineering foundation shell", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: "Engineering foundation is running.",
      }),
    ).toBeInTheDocument();
  });
});
