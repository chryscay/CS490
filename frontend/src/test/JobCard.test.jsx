import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import JobCard from '../features/jobs/JobCard';
import { STAGES } from '../features/jobs/stageStyles';

const mockJob = {
  _id: 'abc123',
  title: 'Frontend Engineer',
  company: 'Acme Corp',
  stage: 'Applied',
  lastActivityAt: '2026-06-10T00:00:00.000Z',
};

describe('JobCard', () => {
  it('renders the job title', () => {
    render(<ul><JobCard job={mockJob} /></ul>);
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
  });

  it('renders the stage badge for every canonical stage', () => {
    STAGES.forEach((stage) => {
      const { unmount } = render(<ul><JobCard job={{ ...mockJob, stage }} /></ul>);
      expect(screen.getByText(stage)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders the company name', () => {
    render(<ul><JobCard job={mockJob} /></ul>);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('renders the stage badge', () => {
    render(<ul><JobCard job={mockJob} /></ul>);
    expect(screen.getByText('Applied')).toBeInTheDocument();
  });

  it('renders the formatted last activity date', () => {
    const expectedDate = new Date(mockJob.lastActivityAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    render(<ul><JobCard job={mockJob} /></ul>);
    expect(screen.getByText(`Last activity: ${expectedDate}`)).toBeInTheDocument();
  });

  it('renders a fallback when lastActivityAt is missing', () => {
    render(<ul><JobCard job={{ ...mockJob, lastActivityAt: undefined }} /></ul>);
    expect(screen.getByText('Last activity: -')).toBeInTheDocument();
  });

  it('does not render other jobs data', () => {
    const otherJob = { ...mockJob, title: 'Backend Engineer', company: 'Other Co' };
    render(<ul><JobCard job={otherJob} /></ul>);
    expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument();
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();
  });

  it('renders optional job details when provided', () => {
    const jobWithOptional = {
      ...mockJob,
      deadline: '2026-06-30T00:00:00.000Z',
      recruiterName: 'Jane Recruiter',
      contactNotes: 'Email after applying',
    };
    const expectedDeadline = new Date(jobWithOptional.deadline).toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }
    );

    render(<ul><JobCard job={jobWithOptional} /></ul>);

    expect(screen.getByText(`Deadline: ${expectedDeadline}`)).toBeInTheDocument();
    expect(screen.getByText('Contact: Jane Recruiter')).toBeInTheDocument();
    expect(screen.getByText('Notes: Email after applying')).toBeInTheDocument();
  });
});
