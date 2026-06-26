import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import InterviewForm, { ROUND_TYPES } from '../features/jobs/InterviewForm';

const defaultProps = {
  interview: null,
  onSave: vi.fn(),
  onClose: vi.fn(),
};

describe('InterviewForm', () => {
  it('renders in add mode with the correct dialog label', () => {
    render(<InterviewForm {...defaultProps} />);
    expect(screen.getByRole('dialog', { name: /add interview/i })).toBeInTheDocument();
  });

  it('renders the round type select with all canonical options', () => {
    render(<InterviewForm {...defaultProps} />);
    const select = screen.getByRole('combobox', { name: /round type/i });
    expect(select).toBeInTheDocument();
    ROUND_TYPES.forEach((rt) => {
      expect(screen.getByRole('option', { name: rt })).toBeInTheDocument();
    });
  });

  it('renders the date & time input', () => {
    render(<InterviewForm {...defaultProps} />);
    expect(screen.getByLabelText(/date.*time/i)).toBeInTheDocument();
  });

  it('renders the notes textarea', () => {
    render(<InterviewForm {...defaultProps} />);
    expect(screen.getByRole('textbox', { name: /notes/i })).toBeInTheDocument();
  });

  it('shows a validation error when submitted without a date', async () => {
    const user = userEvent.setup();
    render(<InterviewForm {...defaultProps} onSave={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /add interview/i }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it('shows a validation error when submitted without notes', async () => {
    const user = userEvent.setup();
    render(<InterviewForm {...defaultProps} onSave={vi.fn()} />);

    const dtInput = screen.getByLabelText(/date.*time/i);
    await user.type(dtInput, '2026-08-01T14:00');

    await user.click(screen.getByRole('button', { name: /add interview/i }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('calls onSave with correct data on valid submit', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<InterviewForm {...defaultProps} onSave={onSave} />);

    await user.selectOptions(screen.getByRole('combobox', { name: /round type/i }), 'System Design');

    const dtInput = screen.getByLabelText(/date.*time/i);
    await user.type(dtInput, '2026-08-01T14:00');

    await user.type(screen.getByRole('textbox', { name: /notes/i }), 'Design a URL shortener.');

    await user.click(screen.getByRole('button', { name: /add interview/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        roundType: 'System Design',
        scheduledAt: expect.any(String),
        notes: 'Design a URL shortener.',
      })
    );
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<InterviewForm {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders in edit mode with pre-filled values', () => {
    const existing = {
      id: 'iv-1',
      roundType: 'Behavioral',
      scheduledAt: '2026-08-10T09:00:00.000Z',
      notes: 'Tell me about a challenge.',
    };
    render(<InterviewForm {...defaultProps} interview={existing} />);

    expect(screen.getByRole('dialog', { name: /edit interview/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /round type/i })).toHaveValue('Behavioral');
    expect(screen.getByRole('textbox', { name: /notes/i })).toHaveValue('Tell me about a challenge.');
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('displays a server error when the error prop is set', () => {
    render(<InterviewForm {...defaultProps} error="Failed to save interview." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to save interview.');
  });

  it('disables buttons while submitting', () => {
    render(<InterviewForm {...defaultProps} isSubmitting={true} />);
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });
});
