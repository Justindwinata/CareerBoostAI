import { fireEvent, render, screen } from "@testing-library/react";

import { ResumeUploadForm } from "./ResumeUploadForm";

function createPdfFile(name = "resume.pdf") {
  return new File(["%PDF-1.7"], name, { type: "application/pdf" });
}

describe("ResumeUploadForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submits a selected PDF resume", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "accepted",
          filename: "resume.pdf",
          content_type: "application/pdf",
          size_bytes: 8,
          message: "Resume upload accepted. Analysis is not started in this contract.",
        }),
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

    expect(
      await screen.findByText("Resume upload accepted. Analysis is not started in this contract."),
    ).toBeVisible();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects non-PDF files before submitting", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const textFile = new File(["resume"], "resume.txt", { type: "text/plain" });

    render(<ResumeUploadForm />);

    fireEvent.change(screen.getByLabelText("Select PDF resume"), {
      target: { files: [textFile] },
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Resume must be a PDF file.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows backend validation errors", async () => {
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
      "Password-protected PDFs are not supported.",
    );
  });
});
