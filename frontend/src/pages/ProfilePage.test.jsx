import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ProfilePage from './ProfilePage.jsx';

const mockUseAuth = vi.fn();
const fetchMock = vi.fn();

vi.mock('../features/auth/useAuth.js', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockUseAuth.mockReturnValue({
      currentUser: {
        email: 'a@test.com',
        getIdToken: vi.fn().mockResolvedValue('faketoken'),
      },
    });
  });

  it('loads and shows the saved profile (happy path)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        profile: {
          email: 'a@test.com',
          fullName: 'Ada Lovelace',
          phone: '555-0100',
          location: 'London',
          summary: 'Mathematician',
        },
      }),
    });

    render(<ProfilePage />);

    expect(await screen.findByDisplayValue('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Mathematician')).toBeInTheDocument();
  });

  it('shows the completion indicator and updates as baseline fields change (C18)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        profile: {
          email: 'a@test.com',
          fullName: 'Ada Lovelace',
          phone: '',
          location: '',
          summary: '',
        },
      }),
    });

    render(<ProfilePage />);

    // Loaded with fullName filled, summary empty → 1 of 2 required complete
    expect(await screen.findByText('1/2')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/summary/i), {
      target: { value: 'Mathematician' },
    });
    expect(screen.getByText('2/2')).toBeInTheDocument();
  });

  it('shows field-level errors when required fields are empty (validation)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        profile: { email: 'a@test.com', fullName: '', summary: '' },
      }),
    });

    render(<ProfilePage />);

    await screen.findByLabelText(/full name/i);
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    expect(
      await screen.findByText(/full name is required/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/summary is required/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
