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

  // Filter controls (SCRUM-39)
  it('renders the stage filter control', () => {
    render(<DashboardPage />);
    expect(screen.getByRole('combobox', { name: /filter by stage/i })).toBeInTheDocument();
  });

  it('renders the deadline filter control', () => {
    render(<DashboardPage />);
    expect(screen.getByRole('combobox', { name: /filter by deadline/i })).toBeInTheDocument();
  });

  it('renders the location filter input', () => {
    render(<DashboardPage />);
    expect(screen.getByRole('textbox', { name: /filter by location/i })).toBeInTheDocument();
  });

  it('stage filter shows only jobs matching the selected stage', async () => {
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

    await user.selectOptions(screen.getByRole('combobox', { name: /filter by stage/i }), 'Interview');

    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument();
  });

  it('stage filter "All stages" shows all jobs', async () => {
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

    await user.selectOptions(screen.getByRole('combobox', { name: /filter by stage/i }), 'Interview');
    await user.selectOptions(screen.getByRole('combobox', { name: /filter by stage/i }), '');

    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
  });

  it('deadline filter "has-deadline" hides jobs without a deadline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        jobs: [
          { _id: '1', title: 'Frontend Engineer', company: 'Acme', stage: 'Applied', lastActivityAt: '2026-06-10T00:00:00.000Z', deadline: '2027-01-01T00:00:00.000Z' },
          { _id: '2', title: 'Backend Engineer', company: 'Globex', stage: 'Interview', lastActivityAt: '2026-06-09T00:00:00.000Z' },
        ],
      }),
    }));

    const user = userEvent.setup();
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText('Frontend Engineer')).toBeInTheDocument());

    await user.selectOptions(screen.getByRole('combobox', { name: /filter by deadline/i }), 'has-deadline');

    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument();
  });

  it('shows no-match message when filters exclude all jobs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        jobs: [
          { _id: '1', title: 'Frontend Engineer', company: 'Acme', stage: 'Applied', lastActivityAt: '2026-06-10T00:00:00.000Z' },
        ],
      }),
    }));

    const user = userEvent.setup();
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText('Frontend Engineer')).toBeInTheDocument());

    await user.selectOptions(screen.getByRole('combobox', { name: /filter by stage/i }), 'Offer');

    expect(screen.getByText(/no jobs match your filters/i)).toBeInTheDocument();
    expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument();
  });

  it('clear filters button appears when a filter is active and resets to all jobs', async () => {
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

    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: /filter by stage/i }), 'Applied');
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clear filters/i }));

    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
  });
});
