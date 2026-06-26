import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FollowUpForm from '../features/jobs/FollowUpForm';

const defaultProps = {
  followUp: null,
  onSave: vi.fn(),
  onClose: vi.fn(),
};

describe('FollowUpForm', () => {
  it('renders in add mode with the correct dialog label', () => {
    render(<FollowUpForm {...defaultProps} />);
    expect(screen.getByRole('dialog', { name: /add follow-up/i })).toBeInTheDocument();
  });

  it('renders the title input', () => {
    render(<FollowUpForm {...defaultProps} />);
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it('renders the due date & time input', () => {
    render(<FollowUpForm {...defaultProps} />);
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
  });

  it('shows a validation error when submitted without a title', async () => {
    const user = userEvent.setup();
    render(<FollowUpForm {...defaultProps} onSave={vi.fn()} />);

    const dtInput = screen.getByLabelText(/due date/i);
    await user.type(dtInput, '2026-08-03T09:00');

    await user.click(screen.getByRole('button', { name: /add follow-up/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/title is required/i);
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it('shows a validation error when submitted without a due date', async () => {
    const user = userEvent.setup();
    render(<FollowUpForm {...defaultProps} onSave={vi.fn()} />);

    await user.type(screen.getByLabelText(/title/i), 'Send thank you email');

    await user.click(screen.getByRole('button', { name: /add follow-up/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/due date/i);
  });

  it('calls onSave with correct data on valid submit', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<FollowUpForm {...defaultProps} onSave={onSave} />);

    await user.type(screen.getByLabelText(/title/i), 'Send thank you email');

    const dtInput = screen.getByLabelText(/due date/i);
    await user.type(dtInput, '2026-08-03T09:00');

    await user.click(screen.getByRole('button', { name: /add follow-up/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Send thank you email',
        dueAt: expect.any(String),
      })
    );
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<FollowUpForm {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders in edit mode with pre-filled values', () => {
    const existing = {
      id: 'fu-1',
      title: 'Check hiring portal',
      dueAt: '2026-08-10T10:00:00.000Z',
    };
    render(<FollowUpForm {...defaultProps} followUp={existing} />);

    expect(screen.getByRole('dialog', { name: /edit follow-up/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue('Check hiring portal');
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('displays a server error when the error prop is set', () => {
    render(<FollowUpForm {...defaultProps} error="Failed to save follow-up." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to save follow-up.');
  });

  it('disables buttons while submitting', () => {
    render(<FollowUpForm {...defaultProps} isSubmitting={true} />);
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });
});
