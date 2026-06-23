import PropTypes from 'prop-types';
import { getStageStyles } from './stageStyles';

export default function TransitionConfirmDialog({
  fromStage,
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
        aria-label="Confirm non-forward stage change"
        className="fixed left-1/2 top-1/2 z-[70] w-full max-w-md -translate-x-1/2 -translate-y-1/2
                   rounded-2xl border border-white/10 bg-[#13131f] p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-white">Confirm stage change</h2>
        <p className="mt-2 text-sm text-white/60">
          This isn&apos;t a normal forward move. You&apos;re changing the stage from{' '}
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStageStyles(fromStage)}`}>
            {fromStage}
          </span>{' '}
          to{' '}
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStageStyles(toStage)}`}>
            {toStage}
          </span>
          . This will be recorded as an override.
        </p>

        <label
          htmlFor="override-note"
          className="mt-4 block text-xs font-medium uppercase tracking-wider text-white/50"
        >
          Reason (optional)
        </label>
        <textarea
          id="override-note"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={3}
          placeholder="Why are you making this change?"
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
            className="rounded-lg border border-yellow-500/30 bg-yellow-500/20 px-4 py-2 text-sm font-medium
                       text-yellow-200 hover:bg-yellow-500/30 disabled:opacity-50 transition"
          >
            {isSubmitting ? 'Saving…' : 'Confirm change'}
          </button>
        </div>
      </div>
    </>
  );
}

TransitionConfirmDialog.propTypes = {
  fromStage: PropTypes.string.isRequired,
  toStage: PropTypes.string.isRequired,
  note: PropTypes.string.isRequired,
  onNoteChange: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
};