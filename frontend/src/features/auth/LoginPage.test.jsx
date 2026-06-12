import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./LoginPage.jsx";

const mockLogin = vi.fn();

vi.mock("./useAuth.js", () => ({
  useAuth: () => ({
    currentUser: null,
    login: mockLogin,
    logout: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("LoginPage", () => {
  it("shows a meaningful error when login fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockLogin.mockRejectedValue(new Error("auth/wrong-password"));

    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/email/i), "test@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong-pass");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));

    expect(
      await screen.findByText(/login failed. check your email and password./i),
    ).toBeInTheDocument();
  });
});