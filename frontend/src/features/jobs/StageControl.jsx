import PropTypes from 'prop-types';
import { STAGES, getStageStyles } from './stageStyles';
import TransitionConfirmDialog from './TransitionConfirmDialog';
import useStageTransition from './useStageTransition';

export default function StageControl({ job, transition, onTransitioned }) {
  const {
    status, error, pending, note, setNote,
    requestStage, confirm, cancel, isSubmitting,
  } = useStageTransition({ transition, onTransitioned });

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        aria-label="Change stage"
        value={job.stage}
        disabled={isSubmitting}
        onChange={(e) => requestStage(e.target.value)}
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