import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthContext.jsx';
import { useAuth } from './useAuth.js';
import { useState } from 'react';

const mockOnAuthStateChanged = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockSignOut = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
const fetchMock = vi.fn();

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...args) =>
    mockCreateUserWithEmailAndPassword(...args),
  onAuthStateChanged: (...args) => mockOnAuthStateChanged(...args),
  sendPasswordResetEmail: (...args) => mockSendPasswordResetEmail(...args),
  signInWithEmailAndPassword: (...args) =>
    mockSignInWithEmailAndPassword(...args),
  signOut: (...args) => mockSignOut(...args),
  getAuth: vi.fn(() => ({})),
}));

vi.mock('../../lib/firebase-client.js', () => ({
  auth: {},
}));

afterEach(() => {
  cleanup();
});

function AuthConsumer() {
  const { currentUser, login, resetPassword, logout } = useAuth();

  return (
    <div>
      <p>{currentUser ? currentUser.email : 'No user'}</p>
      <button
        type="button"
        onClick={() => login({ email: 'test@test.com', password: 'password' })}
      >
        Login
      </button>
      <button
        type="button"
        onClick={() => resetPassword({ email: 'test@test.com' })}
      >
        Reset password
      </button>
      <button type="button" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return vi.fn();
    });
  });

  it('starts with no current user', () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByText('No user')).toBeInTheDocument();
  });

  it('tracks the current user from Firebase auth state', () => {
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ email: 'test@test.com' });
      return vi.fn();
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByText('test@test.com')).toBeInTheDocument();
  });

  it('logs in with email and password', async () => {
    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: { email: 'test@test.com' },
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByRole('button', { name: /login/i }).click();
    });

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      'test@test.com',
      'password'
    );
  });

  it('sends a password reset email through Firebase', async () => {
    mockSendPasswordResetEmail.mockResolvedValue();

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByRole('button', { name: /reset password/i }).click();
    });

    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      {},
      'test@test.com'
    );
  });

  it('logs out and clears the current user', async () => {
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ email: 'test@test.com' });
      return vi.fn();
    });
    mockSignOut.mockResolvedValue();

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByText('test@test.com')).toBeInTheDocument();

    await act(async () => {
      screen.getByRole('button', { name: /logout/i }).click();
    });

    expect(mockSignOut).toHaveBeenCalledWith({});
    expect(screen.getByText('No user')).toBeInTheDocument();
  });
});

function RegisterConsumer() {
  const { register } = useAuth();
  const [result, setResult] = useState('idle');

  async function handleRegister() {
    try {
      await register({
        email: 'new@test.com',
        password: 'password123',
        username: 'NewUser',
      });

      setResult('success');
    } catch (err) {
      setResult(`error: ${err.message}`);
    }
  }

  return (
    <div>
      <p>{result}</p>

      <button type="button" onClick={handleRegister}>
        Register
      </button>
    </div>
  );
}

describe('register()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();

    globalThis.fetch = fetchMock;

    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return vi.fn();
    });
  });

  it('registers a user successfully', async () => {
    const mockUser = {
      getIdToken: vi.fn().mockResolvedValue('token'),
    };

    mockCreateUserWithEmailAndPassword.mockResolvedValue({
      user: mockUser,
    });

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          available: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'User created',
        }),
      });

    render(
      <AuthProvider>
        <RegisterConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByRole('button', { name: /register/i }).click();
    });

    expect(await screen.findByText('success')).toBeInTheDocument();

    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalled();
  });

  it('rejects registration when username is already taken', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: false,
      }),
    });

    render(
      <AuthProvider>
        <RegisterConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByRole('button', { name: /register/i }).click();
    });

    expect(await screen.findByText(/already taken/i)).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockCreateUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('deletes firebase user when backend registration fails', async () => {
    const mockDelete = vi.fn().mockResolvedValue();

    const mockUser = {
      getIdToken: vi.fn().mockResolvedValue('token'),
      delete: mockDelete,
    };

    mockCreateUserWithEmailAndPassword.mockResolvedValue({
      user: mockUser,
    });

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          available: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Backend failure',
        }),
      });

    render(
      <AuthProvider>
        <RegisterConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByRole('button', { name: /register/i }).click();
    });

    expect(mockDelete).toHaveBeenCalled();
  });
});
