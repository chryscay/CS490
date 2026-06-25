import PropTypes from 'prop-types';
import { getStageStyles } from './stageStyles';

export default function OutcomeNoteDialog({
  toStage,
  note,
  onNoteChange,
  onConfirm,
  onCancel,
  isSubmitting,
}) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[60]"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-label="Record outcome note"
        className="fixed left-1/2 top-1/2 z-[70] w-full max-w-md -translate-x-1/2 -translate-y-1/2
                   rounded-2xl border border-white/10 bg-[#13131f] p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-white">Record outcome</h2>
        <p className="mt-2 text-sm text-white/60">
          Moving this job to{' '}
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStageStyles(toStage)}`}>
            {toStage}
          </span>
          . You can add a note about the outcome.
        </p>

        <label
          htmlFor="outcome-note"
          className="mt-4 block text-xs font-medium uppercase tracking-wider text-white/50"
        >
          Outcome note (optional)
        </label>
        <textarea
          id="outcome-note"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={3}
          placeholder="e.g. Accepted offer, salary above target"
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/80
                     placeholder-white/30 focus:border-white/20 focus:outline-none"
        />

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70
                       hover:bg-white/5 hover:text-white disabled:opacity-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="rounded-lg border border-green-500/30 bg-green-500/20 px-4 py-2 text-sm font-medium
                       text-green-200 hover:bg-green-500/30 disabled:opacity-50 transition"
          >
            {isSubmitting ? 'Saving…' : 'Save outcome'}
          </button>
        </div>
      </div>
    </>
  );
}

OutcomeNoteDialog.propTypes = {
  toStage: PropTypes.string.isRequired,
  note: PropTypes.string.isRequired,
  onNoteChange: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
};