import { useState } from 'react';

// transition(toStage, { confirmOverride, note }) must resolve to either:
//   { job }                                       -> success, stage changed
//   { requiresConfirmation, fromStage, toStage }  -> 409, override confirm needed
// and throw on network/500 so we route to the error state.
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
        setPending({ fromStage: result.fromStage, toStage: result.toStage });
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

  // user picked a target stage from the control
  function requestStage(toStage) {
    return run(toStage, { confirmOverride: false, note: '' });
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
    status,
    error,
    pending, // truthy => render the confirm dialog
    note,
    setNote,
    requestStage,
    confirm,
    cancel,
    isSubmitting: status === 'saving',
  };
}