import { useState } from 'react';

export default function useStageTransition({ transition, onTransitioned }) {
  const [status, setStatus] = useState('idle'); // idle | saving | error
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null); // { fromStage, toStage } when confirm needed
  const [note, setNote] = useState('');

  async function run(toStage, options) {
    try {
      setStatus('saving');
      setError('');
      const result = await transition(toStage, options);

      if (result?.requiresConfirmation) {
        // S2-013: the move into an outcome stage turned out to be non-forward
        // (e.g. Interested->Offer). Keep the note the user already typed so the
        // override dialog pre-fills it; the server stays the forward-ness judge.
        setPending({ fromStage: result.fromStage, toStage: result.toStage });
        setNote(options?.note ?? '');
        setStatus('idle');
        return;
      }

      onTransitioned?.(result.job);
      setPending(null);
      setNote('');
      setStatus('idle');
    } catch {
      setStatus('error');
      setError('We could not update the stage. Please try again.');
    }
  }

  // user picked a target stage; note is optional (outcome capture passes one)
  function requestStage(toStage, noteText = '') {
    return run(toStage, { confirmOverride: false, note: noteText });
  }

  // user confirmed the override in the dialog
  function confirm() {
    if (!pending) return undefined;
    return run(pending.toStage, { confirmOverride: true, note });
  }

  function cancel() {
    setPending(null);
    setNote('');
    setStatus('idle');
    setError('');
  }

  return {
    status, error, pending, note, setNote,
    requestStage, confirm, cancel,
    isSubmitting: status === 'saving',
  };
}