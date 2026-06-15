import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import DashboardPage from '../pages/DashboardPage';

vi.mock('../features/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../features/auth/useAuth';

const mockUser = {
  getIdToken: vi.fn().mockResolvedValue('fake-token'),
};

beforeEach(() => {
  useAuth.mockReturnValue({ currentUser: mockUser });
  vi.spyOn(global, 'fetch').mockResolvedValue({
    json: vi.fn().mockResolvedValue({ jobs: [] }),
  });
});

describe('DashboardPage', () => {
  it('renders the Dashboard heading', async () => {
    render(<DashboardPage />);
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
  });

  it('renders the job board section', async () => {
    render(<DashboardPage />);
    expect(screen.getByRole('region', { name: /job board/i })).toBeInTheDocument();
  });

  it('shows empty state when there are no jobs', async () => {
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText(/no jobs yet/i)).toBeInTheDocument());
  });

  it('renders an Add Job button', () => {
    render(<DashboardPage />);
    expect(screen.getByRole('button', { name: /add job/i })).toBeInTheDocument();
  });

  it('renders all four stat card labels', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Total Jobs')).toBeInTheDocument();
    expect(screen.getByText('Applications')).toBeInTheDocument();
    expect(screen.getByText('Interviews')).toBeInTheDocument();
    expect(screen.getByText('Hired')).toBeInTheDocument();
  });

  it('renders job cards when jobs are returned from the API', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        jobs: [
          { _id: '1', title: 'Frontend Engineer', company: 'Acme', stage: 'Applied', lastActivityAt: '2026-06-10T00:00:00.000Z' },
        ],
      }),
    });

    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText('Frontend Engineer')).toBeInTheDocument());
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });

  it('shows loading state before jobs are fetched', () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}));
    render(<DashboardPage />);
    expect(screen.getByLabelText(/loading jobs/i)).toBeInTheDocument();
  });
});
