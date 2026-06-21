import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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

  it('calls onSelect when the card is clicked', async () => {
    const onSelect = vi.fn();
    render(<ul><JobCard job={mockJob} onSelect={onSelect} /></ul>);
    await userEvent.click(screen.getByRole('listitem', { name: /view details for frontend engineer/i }));
    expect(onSelect).toHaveBeenCalledWith(mockJob);
  });

  it('calls onEdit but not onSelect when the Edit button is clicked', async () => {
    const onSelect = vi.fn();
    const onEdit = vi.fn();
    render(<ul><JobCard job={mockJob} onSelect={onSelect} onEdit={onEdit} /></ul>);
    await userEvent.click(screen.getByRole('button', { name: /edit frontend engineer/i }));
    expect(onEdit).toHaveBeenCalledWith(mockJob);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not render other jobs data', () => {
    const otherJob = { ...mockJob, title: 'Backend Engineer', company: 'Other Co' };
    render(<ul><JobCard job={otherJob} /></ul>);
    expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument();
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();
  });
});
