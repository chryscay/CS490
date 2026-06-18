import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from './SettingsPage.jsx';

const mockUseAuth = vi.fn();

vi.mock('../features/auth/useAuth.js', () => ({
  useAuth: () => mockUseAuth(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SettingsPage', () => {
  it('renders the account section with the signed-in user details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          profile: {
            username: 'testuser',
            email: 'test@test.com',
          },
        }),
      })
    );

    mockUseAuth.mockReturnValue({
      currentUser: {
        email: 'test@test.com',
        getIdToken: vi.fn().mockResolvedValue('fake-token'),
      },
    });

    render(<SettingsPage />);

    expect(
      screen.getByRole('heading', { name: /settings/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: /account/i })
    ).toBeInTheDocument();

    expect(await screen.findByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('test@test.com')).toBeInTheDocument();
  });

  it('falls back gracefully when there is no signed-in user', () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
    });

    render(<SettingsPage />);

    expect(
      screen.getByRole('heading', { name: /settings/i })
    ).toBeInTheDocument();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
