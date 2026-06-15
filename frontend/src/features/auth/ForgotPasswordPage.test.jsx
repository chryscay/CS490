import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import ForgotPasswordPage from "./ForgotPasswordPage.jsx";

const mockResetPassword = vi.fn();

vi.mock("./useAuth.js", () => ({
  useAuth: () => ({
    resetPassword: mockResetPassword,
  }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mockResetPassword.mockReset();
});

describe("ForgotPasswordPage", () => {
  it("sends a password reset email for a submitted email", async () => {
    mockResetPassword.mockResolvedValue();

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/email/i), "test@test.com");
    await userEvent.click(
      screen.getByRole("button", { name: /send reset email/i }),
    );

    expect(mockResetPassword).toHaveBeenCalledWith({
      email: "test@test.com",
    });

    expect(
      await screen.findByText(/password reset email has been sent/i),
    ).toBeInTheDocument();
  });

  it("shows a friendly error when reset email fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockResetPassword.mockRejectedValue(new Error("auth/user-not-found"));

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/email/i), "missing@test.com");
    await userEvent.click(
      screen.getByRole("button", { name: /send reset email/i }),
    );

    expect(
      await screen.findByText(/unable to send password reset email/i),
    ).toBeInTheDocument();
  });
});