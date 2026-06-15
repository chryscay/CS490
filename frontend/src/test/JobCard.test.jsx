import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import JobCard from '../features/jobs/JobCard';

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

  it('renders the company name', () => {
    render(<ul><JobCard job={mockJob} /></ul>);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('renders the stage badge', () => {
    render(<ul><JobCard job={mockJob} /></ul>);
    expect(screen.getByText('Applied')).toBeInTheDocument();
  });

  it('renders the last activity date', () => {
    render(<ul><JobCard job={mockJob} /></ul>);
    expect(screen.getByText(/last activity/i)).toBeInTheDocument();
  });

  it('does not render other jobs data', () => {
    const otherJob = { ...mockJob, title: 'Backend Engineer', company: 'Other Co' };
    render(<ul><JobCard job={otherJob} /></ul>);
    expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument();
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();
  });
});
