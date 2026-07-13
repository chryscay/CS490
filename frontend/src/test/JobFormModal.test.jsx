import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import JobFormModal from "../features/jobs/JobFormModal";

const mockGetIdToken = vi.fn().mockResolvedValue("faketoken");

vi.mock("../features/auth/useAuth", () => ({
  useAuth: () => ({
    currentUser: { getIdToken: mockGetIdToken },
  }),
}));

describe("JobFormModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: "Job created", id: "job-1" }),
      })
    );
  });

  it("renders the create form with required fields", () => {
    render(<JobFormModal onClose={() => {}} onSaved={() => {}} />);
    expect(screen.getByText("Add Job")).toBeInTheDocument();
    expect(screen.getByLabelText("Company")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Job Posting Body")).toBeInTheDocument();
    expect(screen.getByLabelText("Deadline")).toBeInTheDocument();
    expect(screen.getByLabelText("Recruiter / Contact Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Recruiter / Contact Notes")).toBeInTheDocument();
  });

  it("shows validation errors and does not submit when fields are empty", async () => {
    render(<JobFormModal onClose={() => {}} onSaved={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Company is required")).toBeInTheDocument();
    expect(screen.getByText("Title is required")).toBeInTheDocument();
    expect(screen.getByText("Job posting body is required")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("submits a create with the auth token (happy path)", async () => {
    const onSaved = vi.fn();
    render(<JobFormModal onClose={() => {}} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText("Company"), {
      target: { value: "Acme" },
    });
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Engineer" },
    });
    fireEvent.change(screen.getByLabelText("Job Posting Body"), {
      target: { value: "We are hiring." },
    });
    fireEvent.change(screen.getByLabelText("Deadline"), {
      target: { value: "2026-06-30" },
    });
    fireEvent.change(screen.getByLabelText("Recruiter / Contact Name"), {
      target: { value: "Jane Recruiter" },
    });
    fireEvent.change(screen.getByLabelText("Recruiter / Contact Notes"), {
      target: { value: "Email after applying" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/jobs"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer faketoken",
        }),
      })
    );
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).toMatchObject({
      deadline: "2026-06-30",
      recruiterName: "Jane Recruiter",
      contactNotes: "Email after applying",
    });
  });

  it("pre-fills fields and submits a PUT when editing", async () => {
    const job = {
      _id: "job-9",
      company: "Acme",
      title: "Engineer",
      jobPostingBody: "Existing body",
      stage: "Applied",
      deadline: "2026-06-30",
      recruiterName: "Jane Recruiter",
      contactNotes: "Email after applying",
    };
    const onSaved = vi.fn();
    render(<JobFormModal job={job} onClose={() => {}} onSaved={onSaved} />);
    expect(screen.getByText("Edit Job")).toBeInTheDocument();
    expect(screen.getByLabelText("Company")).toHaveValue("Acme");
    expect(screen.getByLabelText("Deadline")).toHaveValue("2026-06-30");
    expect(screen.getByLabelText("Recruiter / Contact Name")).toHaveValue(
      "Jane Recruiter"
    );
    expect(screen.getByLabelText("Recruiter / Contact Notes")).toHaveValue(
      "Email after applying"
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/jobs/job-9"),
      expect.objectContaining({ method: "PUT" })
    );
  });
});
