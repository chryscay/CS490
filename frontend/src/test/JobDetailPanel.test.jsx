import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import JobDetailPanel from '../features/jobs/JobDetailPanel';

const mockJob = {
  _id: 'abc123',
  title: 'Frontend Engineer',
  company: 'Acme Corp',
  stage: 'Applied',
  jobPostingBody: 'We are looking for a frontend engineer.',
  createdAt: '2026-06-01T00:00:00.000Z',
  lastActivityAt: '2026-06-10T00:00:00.000Z',
  deadline: '2026-07-15T00:00:00.000Z',
  recruiterName: 'Jane Smith',
  contactNotes: 'Follow up next week',
};

const defaultProps = {
  job: mockJob,
  onClose: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

describe('JobDetailPanel', () => {
  it('renders the job title', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /frontend engineer/i })).toBeInTheDocument();
  });

  // Outcome surfacing (S2-013)
  const outcomeJob = {
    ...mockJob,
    stage: 'Offer',
    stageHistory: [
      { toStage: 'Applied', note: '', changedAt: '2026-06-05T00:00:00.000Z' },
      { toStage: 'Offer', note: 'Signed offer letter', changedAt: '2026-06-12T00:00:00.000Z' },
    ],
  };

  it('renders the Outcome section with the note for a job in an outcome stage', () => {
    render(<JobDetailPanel {...defaultProps} job={outcomeJob} />);
    const section = screen.getByText('Outcome').closest('div');
    expect(within(section).getByText('Signed offer letter')).toBeInTheDocument();
  });

  it('shows an empty outcome message when no note was recorded', () => {
    const noNote = {
      ...mockJob,
      stage: 'Rejected',
      stageHistory: [{ toStage: 'Rejected', note: '', changedAt: '2026-06-12T00:00:00.000Z' }],
    };
    render(<JobDetailPanel {...defaultProps} job={noNote} />);
    expect(screen.getByText(/no outcome note recorded/i)).toBeInTheDocument();
  });

  it('does not render the Outcome section for a non-outcome stage', () => {
    render(<JobDetailPanel {...defaultProps} />); // mockJob is 'Applied'
    expect(screen.queryByText('Outcome')).not.toBeInTheDocument();
  });

  it('renders the company name', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
  });

  it('renders the stage badge', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getAllByText('Applied').length).toBeGreaterThan(0);
  });

  it('renders the job posting body', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getByText(/looking for a frontend engineer/i)).toBeInTheDocument();
  });

  it('renders the timeline section', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getByRole('list', { name: /job activity timeline/i })).toBeInTheDocument();
  });

  it('renders a Job added timeline event', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getByText('Job added')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(<JobDetailPanel {...defaultProps} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /close job details/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onEdit when the Edit button is clicked', async () => {
    const onEdit = vi.fn();
    render(<JobDetailPanel {...defaultProps} onEdit={onEdit} />);
    await userEvent.click(screen.getByRole('button', { name: /edit frontend engineer/i }));
    expect(onEdit).toHaveBeenCalledWith(mockJob);
  });

  it('shows empty timeline message when there are no activity events', () => {
    render(
      <JobDetailPanel
        {...defaultProps}
        job={{ ...mockJob, createdAt: undefined, lastActivityAt: undefined }}
      />
    );
    expect(screen.getByText(/no activity recorded yet/i)).toBeInTheDocument();
  });

  it('shows all six canonical stages correctly', () => {
    const stages = ['Interested', 'Applied', 'Interview', 'Offer', 'Rejected', 'Archived'];
    stages.forEach((stage) => {
      const { unmount } = render(
        <JobDetailPanel {...defaultProps} job={{ ...mockJob, stage }} />
      );
      expect(screen.getAllByText(stage).length).toBeGreaterThan(0);
      unmount();
    });
  });

  // Overview section tests
  it('renders the Overview section', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('renders core fields in the Overview section', () => {
    render(<JobDetailPanel {...defaultProps} />);
    // Find the Overview section and verify core fields within it
    const overviewHeading = screen.getByText('Overview');
    const overviewSection = overviewHeading.closest('div');
    expect(within(overviewSection).getByText('Frontend Engineer')).toBeInTheDocument();
    expect(within(overviewSection).getByText('Acme Corp')).toBeInTheDocument();
    expect(within(overviewSection).getByText('Applied')).toBeInTheDocument();
  });

  it('renders deadline in the Overview section when present', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getByText('Jul 15, 2026')).toBeInTheDocument();
  });

  it('renders recruiter name in the Overview section when present', () => {
    render(<JobDetailPanel {...defaultProps} />);
    const overviewHeading = screen.getByText('Overview');
    const overviewSection = overviewHeading.closest('div');
    expect(within(overviewSection).getByText('Jane Smith')).toBeInTheDocument();
  });

  it('renders contact notes in the Overview section when present', () => {
    render(<JobDetailPanel {...defaultProps} />);
    const overviewHeading = screen.getByText('Overview');
    const overviewSection = overviewHeading.closest('div');
    expect(within(overviewSection).getByText('Follow up next week')).toBeInTheDocument();
  });

  it('does not render deadline in Overview when not present', () => {
    const jobWithoutDeadline = { ...mockJob, deadline: undefined };
    render(<JobDetailPanel {...defaultProps} job={jobWithoutDeadline} />);
    expect(screen.queryByText('Jul 15, 2026')).not.toBeInTheDocument();
  });

  it('does not render recruiter name in Overview when not present', () => {
    const jobWithoutRecruiter = { ...mockJob, recruiterName: undefined };
    render(<JobDetailPanel {...defaultProps} job={jobWithoutRecruiter} />);
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  it('does not render contact notes in Overview when not present', () => {
    const jobWithoutNotes = { ...mockJob, contactNotes: undefined };
    render(<JobDetailPanel {...defaultProps} job={jobWithoutNotes} />);
    expect(screen.queryByText('Follow up next week')).not.toBeInTheDocument();
  });

  // Delete workflow (SCRUM-52) — guarded by confirmation
  it('renders a Delete button', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /delete frontend engineer/i })
    ).toBeInTheDocument();
  });

  it('does not call onDelete until the action is confirmed', async () => {
    const onDelete = vi.fn();
    render(<JobDetailPanel {...defaultProps} onDelete={onDelete} />);
    await userEvent.click(
      screen.getByRole('button', { name: /delete frontend engineer/i })
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('calls onDelete with the job when confirmed', async () => {
    const onDelete = vi.fn();
    render(<JobDetailPanel {...defaultProps} onDelete={onDelete} />);
    await userEvent.click(
      screen.getByRole('button', { name: /delete frontend engineer/i })
    );
    await userEvent.click(screen.getByRole('button', { name: /^delete job$/i }));
    expect(onDelete).toHaveBeenCalledWith(mockJob);
  });

  it('does not call onDelete when the confirmation is cancelled', async () => {
    const onDelete = vi.fn();
    render(<JobDetailPanel {...defaultProps} onDelete={onDelete} />);
    await userEvent.click(
      screen.getByRole('button', { name: /delete frontend engineer/i })
    );
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
