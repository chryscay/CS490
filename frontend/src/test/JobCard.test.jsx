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

// JobCard now requires transition + onTransitioned (passed down to StageControl).
// Helper supplies stubs so every render satisfies the contract.
function renderCard(job = mockJob) {
  return render(
    <ul>
      <JobCard job={job} transition={() => {}} onTransitioned={() => {}} />
    </ul>
  );
}

describe('JobCard', () => {
  it('renders the job title', () => {
    renderCard();
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
  });

  it('renders an option for every canonical stage', () => {
    STAGES.forEach((stage) => {
      const { unmount } = renderCard({ ...mockJob, stage });
      expect(screen.getByText(stage)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders the company name', () => {
    renderCard();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('renders the current stage', () => {
    renderCard();
    expect(screen.getByText('Applied')).toBeInTheDocument();
  });

  it('renders the formatted last activity date', () => {
    const expectedDate = new Date(mockJob.lastActivityAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    renderCard();
    expect(screen.getByText(`Last activity: ${expectedDate}`)).toBeInTheDocument();
  });

  it('renders a fallback when lastActivityAt is missing', () => {
    renderCard({ ...mockJob, lastActivityAt: undefined });
    expect(screen.getByText('Last activity: -')).toBeInTheDocument();
  });

  it('does not render other jobs data', () => {
    const otherJob = { ...mockJob, title: 'Backend Engineer', company: 'Other Co' };
    renderCard(otherJob);
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
    const expectedDeadline = new Date(jobWithOptional.deadline).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    renderCard(jobWithOptional);
    expect(screen.getByText(`Deadline: ${expectedDeadline}`)).toBeInTheDocument();
    expect(screen.getByText('Contact: Jane Recruiter')).toBeInTheDocument();
    expect(screen.getByText('Notes: Email after applying')).toBeInTheDocument();
  });
});