import { render, screen } from '@testing-library/react';
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
};

const defaultProps = {
  job: mockJob,
  onClose: vi.fn(),
  onEdit: vi.fn(),
};

describe('JobDetailPanel', () => {
  it('renders the job title', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /frontend engineer/i })).toBeInTheDocument();
  });

  it('renders the company name', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('renders the stage badge', () => {
    render(<JobDetailPanel {...defaultProps} />);
    expect(screen.getByText('Applied')).toBeInTheDocument();
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
      expect(screen.getByText(stage)).toBeInTheDocument();
      unmount();
    });
  });
});
