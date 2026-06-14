import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthContext.jsx";
import { useAuth } from "./useAuth.js";

const mockOnAuthStateChanged = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockSignOut = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: (...args) =>
    mockCreateUserWithEmailAndPassword(...args),
  onAuthStateChanged: (...args) => mockOnAuthStateChanged(...args),
  signInWithEmailAndPassword: (...args) =>
    mockSignInWithEmailAndPassword(...args),
  signOut: (...args) => mockSignOut(...args),
  getAuth: vi.fn(() => ({})),
}));

vi.mock("../../lib/firebase-client.js", () => ({
  auth: {},
}));

afterEach(() => {
  cleanup();
});

function AuthConsumer() {
  const { currentUser, login, logout } = useAuth();

  return (
    <div>
      <p>{currentUser ? currentUser.email : "No user"}</p>
      <button
        type="button"
        onClick={() => login({ email: "test@test.com", password: "password" })}
      >
        Login
      </button>
      <button type="button" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return vi.fn();
    });
  });

  it("starts with no current user", () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    expect(screen.getByText("No user")).toBeInTheDocument();
  });

  it("tracks the current user from Firebase auth state", () => {
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ email: "test@test.com" });
      return vi.fn();
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    expect(screen.getByText("test@test.com")).toBeInTheDocument();
  });

  it("logs in with email and password", async () => {
    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: { email: "test@test.com" },
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await act(async () => {
      screen.getByRole("button", { name: /login/i }).click();
    });

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      "test@test.com",
      "password",
    );
  });

  it("logs out and clears the current user", async () => {
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ email: "test@test.com" });
      return vi.fn();
    });
    mockSignOut.mockResolvedValue();

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    expect(screen.getByText("test@test.com")).toBeInTheDocument();

    await act(async () => {
      screen.getByRole("button", { name: /logout/i }).click();
    });

    expect(mockSignOut).toHaveBeenCalledWith({});
    expect(screen.getByText("No user")).toBeInTheDocument();
  });
});