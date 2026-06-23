import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StageControl from './StageControl';

describe('StageControl', () => {
  it('fires a forward transition and reports the updated job (happy path)', async () => {
    const updated = { _id: 'job-1', stage: 'Applied' };
    const transition = vi.fn().mockResolvedValue({ job: updated });
    const onTransitioned = vi.fn();

    render(
      <StageControl
        job={{ _id: 'job-1', stage: 'Interested' }}
        transition={transition}
        onTransitioned={onTransitioned}
      />
    );

    fireEvent.change(screen.getByLabelText('Change stage'), {
      target: { value: 'Applied' },
    });

    await waitFor(() => {
      expect(transition).toHaveBeenCalledWith('Applied', {
        confirmOverride: false,
        note: '',
      });
      expect(onTransitioned).toHaveBeenCalledWith(updated);
    });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('opens the confirm dialog on a 409 and re-sends as an override after confirming', async () => {
    const updated = { _id: 'job-1', stage: 'Interested' };
    const transition = vi
      .fn()
      .mockResolvedValueOnce({
        requiresConfirmation: true,
        fromStage: 'Applied',
        toStage: 'Interested',
      })
      .mockResolvedValueOnce({ job: updated });
    const onTransitioned = vi.fn();

    render(
      <StageControl
        job={{ _id: 'job-1', stage: 'Applied' }}
        transition={transition}
        onTransitioned={onTransitioned}
      />
    );

    fireEvent.change(screen.getByLabelText('Change stage'), {
      target: { value: 'Interested' },
    });

    await screen.findByRole('alertdialog');
    expect(onTransitioned).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Reason (optional)'), {
      target: { value: 'reopening' },
    });
    fireEvent.click(screen.getByRole('button', { name: /confirm change/i }));

    await waitFor(() => {
      expect(transition).toHaveBeenLastCalledWith('Interested', {
        confirmOverride: true,
        note: 'reopening',
      });
      expect(onTransitioned).toHaveBeenCalledWith(updated);
    });
  });

  it('shows an error message when the transition fails', async () => {
    const transition = vi.fn().mockRejectedValue(new Error('boom'));
    const onTransitioned = vi.fn();

    render(
      <StageControl
        job={{ _id: 'job-1', stage: 'Interested' }}
        transition={transition}
        onTransitioned={onTransitioned}
      />
    );

    fireEvent.change(screen.getByLabelText('Change stage'), {
      target: { value: 'Applied' },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /could not update the stage/i
    );
    expect(onTransitioned).not.toHaveBeenCalled();
  });
});