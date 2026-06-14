import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "./SettingsPage.jsx";

const mockUseAuth = vi.fn();

vi.mock("../features/auth/useAuth.js", () => ({
  useAuth: () => mockUseAuth(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SettingsPage", () => {
  it("renders the account section with the signed-in user's details", () => {
    mockUseAuth.mockReturnValue({
      currentUser: { displayName: "Test User", email: "test@test.com" },
    });

    render(<SettingsPage />);

    expect(
      screen.getByRole("heading", { name: /settings/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /account/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("test@test.com")).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("falls back gracefully when there is no signed-in user", () => {
    mockUseAuth.mockReturnValue({ currentUser: null });

    render(<SettingsPage />);

    expect(
      screen.getByRole("heading", { name: /settings/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/not set/i).length).toBeGreaterThan(0);
  });
});