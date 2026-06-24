import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue({ jobs: [] }),
  }));
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        jobs: [
          { _id: '1', title: 'Frontend Engineer', company: 'Acme', stage: 'Applied', lastActivityAt: '2026-06-10T00:00:00.000Z' },
        ],
      }),
    }));

    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText('Frontend Engineer')).toBeInTheDocument());
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });

  it('shows loading state before jobs are fetched', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    render(<DashboardPage />);
    expect(screen.getByLabelText(/loading jobs/i)).toBeInTheDocument();
  });

  it('renders a search input for jobs', () => {
    render(<DashboardPage />);
    expect(screen.getByRole('textbox', { name: /search jobs/i })).toBeInTheDocument();
  });

  it('filters jobs by title or company as the user types', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        jobs: [
          { _id: '1', title: 'Frontend Engineer', company: 'Acme', stage: 'Applied', lastActivityAt: '2026-06-10T00:00:00.000Z' },
          { _id: '2', title: 'Backend Engineer', company: 'Globex', stage: 'Interview', lastActivityAt: '2026-06-09T00:00:00.000Z' },
          { _id: '3', title: 'Product Manager', company: 'Acme', stage: 'Hired', lastActivityAt: '2026-06-08T00:00:00.000Z' },
        ],
      }),
    }));

    const user = userEvent.setup();
    render(<DashboardPage />);

    await waitFor(() => expect(screen.getByText('Frontend Engineer')).toBeInTheDocument());

    await user.type(screen.getByRole('textbox', { name: /search jobs/i }), 'acme');

    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Product Manager')).toBeInTheDocument();
    expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument();
  });

  it('shows the empty search state when no jobs match', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        jobs: [
          { _id: '1', title: 'Frontend Engineer', company: 'Acme', stage: 'Applied', lastActivityAt: '2026-06-10T00:00:00.000Z' },
          { _id: '2', title: 'Backend Engineer', company: 'Globex', stage: 'Interview', lastActivityAt: '2026-06-09T00:00:00.000Z' },
        ],
      }),
    }));

    const user = userEvent.setup();
    render(<DashboardPage />);

    await waitFor(() => expect(screen.getByText('Frontend Engineer')).toBeInTheDocument());

    await user.type(screen.getByRole('textbox', { name: /search jobs/i }), 'designer');

    expect(screen.getByText(/no jobs match your search/i)).toBeInTheDocument();
    expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument();
    expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument();
  });
});
