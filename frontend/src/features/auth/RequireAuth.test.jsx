import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./RequireAuth.jsx";

const mockUseAuth = vi.fn();

vi.mock("./useAuth.js", () => ({
  useAuth: () => mockUseAuth(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderRoutes(initialPath = "/dashboard") {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<p>Login Page</p>} />
        <Route path="/register" element={<p>Register Page</p>} />
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<p>Protected Dashboard</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAuth", () => {
  it("lets an authenticated user reach a protected route", () => {
    mockUseAuth.mockReturnValue({
      currentUser: { email: "test@test.com" },
      loading: false,
    });

    renderRoutes();

    expect(screen.getByText("Protected Dashboard")).toBeInTheDocument();
  });

  it("redirects a logged-out user from a protected route to login", () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: false,
    });

    renderRoutes();

    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("waits while auth state is loading before redirecting", () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: true,
    });

    renderRoutes();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
  });

  it("keeps public auth routes reachable while logged out", () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: false,
    });

    renderRoutes("/register");

    expect(screen.getByText("Register Page")).toBeInTheDocument();
  });  

});