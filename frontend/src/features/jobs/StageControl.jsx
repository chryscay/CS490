import { useState } from 'react';
import PropTypes from 'prop-types';
import { STAGES, getStageStyles, isOutcomeStage } from './stageStyles';
import TransitionConfirmDialog from './TransitionConfirmDialog';
import OutcomeNoteDialog from './OutcomeNoteDialog';
import useStageTransition from './useStageTransition';

export default function StageControl({ job, transition, onTransitioned }) {
  const {
    status, error, pending, note, setNote,
    requestStage, confirm, cancel, isSubmitting,
  } = useStageTransition({ transition, onTransitioned });

  // S2-013: a forward move into an outcome stage captures a note with no 409.
  const [outcomeTarget, setOutcomeTarget] = useState(null);

  function handleSelect(toStage) {
    if (toStage === job.stage) return;
    if (isOutcomeStage(toStage)) {
      setNote('');
      setOutcomeTarget(toStage);
      return;
    }
    requestStage(toStage);
  }

  async function confirmOutcome() {
    await requestStage(outcomeTarget, note);
    // If the server said this was actually non-forward, the hook now holds a
    // pending override (note pre-filled). Close the outcome dialog so the
    // override dialog takes over; otherwise we're done.
    setOutcomeTarget(null);
  }

  function cancelOutcome() {
    setOutcomeTarget(null);
    setNote('');
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        aria-label="Change stage"
        value={job.stage}
        disabled={isSubmitting}
        onChange={(e) => handleSelect(e.target.value)}
        className={`rounded-full px-3 py-1 text-xs font-medium bg-transparent
                    focus:outline-none disabled:opacity-50 ${getStageStyles(job.stage)}`}
      >
        {STAGES.map((s) => (
          <option key={s} value={s} className="bg-[#13131f] text-white">
            {s}
          </option>
        ))}
      </select>

      {status === 'error' && (
        <span role="alert" className="text-xs text-red-300">
          {error}
        </span>
      )}

      {outcomeTarget && !pending && (
        <OutcomeNoteDialog
          toStage={outcomeTarget}
          note={note}
          onNoteChange={setNote}
          onConfirm={confirmOutcome}
          onCancel={cancelOutcome}
          isSubmitting={isSubmitting}
        />
      )}

      {pending && (
        <TransitionConfirmDialog
          fromStage={pending.fromStage}
          toStage={pending.toStage}
          note={note}
          onNoteChange={setNote}
          onConfirm={confirm}
          onCancel={cancel}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}

StageControl.propTypes = {
  job: PropTypes.shape({
    _id: PropTypes.string,
    stage: PropTypes.string.isRequired,
  }).isRequired,
  transition: PropTypes.func.isRequired,
  onTransitioned: PropTypes.func.isRequired,
};