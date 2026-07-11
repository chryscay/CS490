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
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ jobs: [] }),
    })
  );
});

describe('DashboardPage', () => {
  it('renders the Dashboard heading', async () => {
    render(<DashboardPage />);
    expect(
      screen.getByRole('heading', { name: /dashboard/i })
    ).toBeInTheDocument();
  });

  it('renders the job board section', async () => {
    render(<DashboardPage />);
    expect(
      screen.getByRole('region', { name: /job board/i })
    ).toBeInTheDocument();
  });

  it('shows empty state when there are no jobs', async () => {
    render(<DashboardPage />);
    await waitFor(() =>
      expect(screen.getByText(/no jobs yet/i)).toBeInTheDocument()
    );
  });

  it('renders an Add Job button', () => {
    render(<DashboardPage />);
    expect(
      screen.getByRole('button', { name: /add job/i })
    ).toBeInTheDocument();
  });

  it('renders all stat card labels', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Total Jobs')).toBeInTheDocument();
    expect(screen.getByText('Applications')).toBeInTheDocument();
    expect(screen.getByText('Interviews')).toBeInTheDocument();
    expect(screen.getByText('Offers')).toBeInTheDocument();
    expect(screen.getByText('Responses')).toBeInTheDocument();
  });

  it('computes stage counts and response tracking from job data (SCRUM-62)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          jobs: [
            {
              _id: '1',
              title: 'A',
              company: 'X',
              stage: 'Interested',
              lastActivityAt: '2026-06-10T00:00:00.000Z',
            },
            {
              _id: '2',
              title: 'B',
              company: 'X',
              stage: 'Applied',
              lastActivityAt: '2026-06-10T00:00:00.000Z',
            },
            {
              _id: '3',
              title: 'C',
              company: 'X',
              stage: 'Applied',
              lastActivityAt: '2026-06-10T00:00:00.000Z',
            },
            {
              _id: '4',
              title: 'D',
              company: 'X',
              stage: 'Interview',
              lastActivityAt: '2026-06-10T00:00:00.000Z',
            },
            {
              _id: '5',
              title: 'E',
              company: 'X',
              stage: 'Offer',
              lastActivityAt: '2026-06-10T00:00:00.000Z',
            },
            {
              _id: '6',
              title: 'F',
              company: 'X',
              stage: 'Rejected',
              lastActivityAt: '2026-06-10T00:00:00.000Z',
            },
          ],
        }),
      })
    );

    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());

    // Each stat card: find the label, read the count in its sibling <h2>.
    const statValue = (label) =>
      screen.getByText(label).closest('div').querySelector('h2').textContent;

    expect(statValue('Total Jobs')).toBe('6');
    expect(statValue('Applications')).toBe('2'); // two Applied
    expect(statValue('Interviews')).toBe('1'); // one Interview
    expect(statValue('Offers')).toBe('1'); // one Offer (was the broken 'Hired' card)
    // Responses = Interview + Offer + Rejected = 3 (excludes Interested + Applied)
    expect(statValue('Responses')).toBe('3');
  });

  it('hides archived jobs by default and shows them when the toggle is flipped (SCRUM-51)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          jobs: [
            {
              _id: '1',
              title: 'Active Role',
              company: 'X',
              stage: 'Applied',
              lastActivityAt: '2026-06-10T00:00:00.000Z',
            },
            {
              _id: '2',
              title: 'Archived Role',
              company: 'X',
              stage: 'Archived',
              lastActivityAt: '2026-06-10T00:00:00.000Z',
            },
          ],
        }),
      })
    );

    const user = userEvent.setup();
    render(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getByText('Active Role')).toBeInTheDocument()
    );
    expect(screen.queryByText('Archived Role')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /show archived jobs/i })
    );
    expect(screen.getByText('Archived Role')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /hide archived jobs/i })
    );
    expect(screen.queryByText('Archived Role')).not.toBeInTheDocument();
  });

  it('renders job cards when jobs are returned from the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          jobs: [
            {
              _id: '1',
              title: 'Frontend Engineer',
              company: 'Acme',
              stage: 'Applied',
              lastActivityAt: '2026-06-10T00:00:00.000Z',
            },
          ],
        }),
      })
    );

    render(<DashboardPage />);
    await waitFor(() =>
      expect(screen.getByText('Frontend Engineer')).toBeInTheDocument()
    );
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
    expect(
      screen.getByRole('combobox', { name: /filter by stage/i })
    ).toBeInTheDocument();
  });

  it('renders the deadline filter control', () => {
    render(<DashboardPage />);
    expect(
      screen.getByRole('combobox', { name: /filter by deadline/i })
    ).toBeInTheDocument();
  });

  it('renders the location filter input', () => {
    render(<DashboardPage />);
    expect(
      screen.getByRole('textbox', { name: /filter by location/i })
    ).toBeInTheDocument();
  });

  it('stage filter shows only jobs matching the selected stage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          jobs: [
            {
              _id: '1',
              title: 'Frontend Engineer',
              company: 'Acme',
              stage: 'Applied',
              lastActivityAt: '2026-06-10T00:00:00.000Z',
            },
            {
              _id: '2',
              title: 'Backend Engineer',
              company: 'Globex',
              stage: 'Interview',
              lastActivityAt: '2026-06-09T00:00:00.000Z',
            },
          ],
        }),
      })
    );

    const user = userEvent.setup();
    render(<DashboardPage />);
    await waitFor(() =>
      expect(screen.getByText('Frontend Engineer')).toBeInTheDocument()
    );

    await user.selectOptions(
      screen.getByRole('combobox', { name: /filter by stage/i }),
      'Interview'
    );

    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument();
  });

  it('stage filter "All stages" shows all jobs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          jobs: [
            {
              _id: '1',
              title: 'Frontend Engineer',
              company: 'Acme',
              stage: 'Applied',
              lastActivityAt: '2026-06-10T00:00:00.000Z',
            },
            {
              _id: '2',
              title: 'Backend Engineer',
              company: 'Globex',
              stage: 'Interview',
              lastActivityAt: '2026-06-09T00:00:00.000Z',
            },
          ],
        }),
      })
    );

    const user = userEvent.setup();
    render(<DashboardPage />);
    await waitFor(() =>
      expect(screen.getByText('Frontend Engineer')).toBeInTheDocument()
    );

    await user.selectOptions(
      screen.getByRole('combobox', { name: /filter by stage/i }),
      'Interview'
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: /filter by stage/i }),
      ''
    );

    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
  });

  it('deadline filter "has-deadline" hides jobs without a deadline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          jobs: [
            {
              _id: '1',
              title: 'Frontend Engineer',
              company: 'Acme',
              stage: 'Applied',
              lastActivityAt: '2026-06-10T00:00:00.000Z',
              deadline: '2027-01-01T00:00:00.000Z',
            },
            {
              _id: '2',
              title: 'Backend Engineer',
              company: 'Globex',
              stage: 'Interview',
              lastActivityAt: '2026-06-09T00:00:00.000Z',
            },
          ],
        }),
      })
    );

    const user = userEvent.setup();
    render(<DashboardPage />);
    await waitFor(() =>
      expect(screen.getByText('Frontend Engineer')).toBeInTheDocument()
    );

    await user.selectOptions(
      screen.getByRole('combobox', { name: /filter by deadline/i }),
      'has-deadline'
    );

    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument();
  });

  it('shows no-match message when filters exclude all jobs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          jobs: [
            {
              _id: '1',
              title: 'Frontend Engineer',
              company: 'Acme',
              stage: 'Applied',
              lastActivityAt: '2026-06-10T00:00:00.000Z',
            },
          ],
        }),
      })
    );

    const user = userEvent.setup();
    render(<DashboardPage />);
    await waitFor(() =>
      expect(screen.getByText('Frontend Engineer')).toBeInTheDocument()
    );

    await user.selectOptions(
      screen.getByRole('combobox', { name: /filter by stage/i }),
      'Offer'
    );

    expect(screen.getByText(/no jobs match your filters/i)).toBeInTheDocument();
    expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument();
  });

  it('clear filters button appears when a filter is active and resets to all jobs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          jobs: [
            {
              _id: '1',
              title: 'Frontend Engineer',
              company: 'Acme',
              stage: 'Applied',
              lastActivityAt: '2026-06-10T00:00:00.000Z',
            },
            {
              _id: '2',
              title: 'Backend Engineer',
              company: 'Globex',
              stage: 'Interview',
              lastActivityAt: '2026-06-09T00:00:00.000Z',
            },
          ],
        }),
      })
    );

    const user = userEvent.setup();
    render(<DashboardPage />);
    await waitFor(() =>
      expect(screen.getByText('Frontend Engineer')).toBeInTheDocument()
    );

    expect(
      screen.queryByRole('button', { name: /clear filters/i })
    ).not.toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole('combobox', { name: /filter by stage/i }),
      'Applied'
    );
    expect(
      screen.getByRole('button', { name: /clear filters/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clear filters/i }));

    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /clear filters/i })
    ).not.toBeInTheDocument();
  });

  it('renders analytics cards from backend analytics data (S3-014)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url) => {
        if (url.includes('/analytics')) {
          return Promise.resolve({
            json: vi.fn().mockResolvedValue({
              velocity: 5,
              stageConversion: 0.4,
              timeInStage: {
                Applied: 3.5,
                Interview: 2.0,
              },
            }),
          });
        }

        return Promise.resolve({
          json: vi.fn().mockResolvedValue({
            jobs: [],
          }),
        });
      })
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Weekly Velocity')).toBeInTheDocument();
    });

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Stage Conversion')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText(/time in stage/i)).toBeInTheDocument();
  });
});
