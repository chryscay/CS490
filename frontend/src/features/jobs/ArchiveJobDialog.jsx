import { useState } from 'react';
import PropTypes from 'prop-types';
import { getStageStyles } from './stageStyles';

// Handles both archive (mode='archive') and restore (mode='restore').
// For archive: optional note textarea, warning about terminal stage.
// For restore: shows the stage the job will return to.
export default function ArchiveJobDialog({
  mode,
  jobTitle,
  restoreTargetStage,
  isSubmitting,
  error,
  onConfirm,
  onCancel,
}) {
  const [note, setNote] = useState('');

  const isArchive = mode === 'archive';

  const handleConfirm = () => {
    onConfirm(isArchive ? note : undefined);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[60]"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-label={isArchive ? 'Archive job' : 'Restore job'}
        className="
          fixed left-1/2 top-1/2 z-[70] w-full max-w-md
          -translate-x-1/2 -translate-y-1/2
          rounded-2xl border border-white/10 bg-[#13131f] p-6 shadow-xl
        "
      >
        <h2 className="text-lg font-semibold text-white">
          {isArchive ? 'Archive job' : 'Restore job'}
        </h2>

        {isArchive ? (
          <p className="mt-2 text-sm text-white/60">
            <span className="font-medium text-white/80">{jobTitle}</span> will be moved to{' '}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStageStyles('Archived')}`}>
              Archived
            </span>
            {' '}and hidden from your active job list. You can restore it any time.
          </p>
        ) : (
          <p className="mt-2 text-sm text-white/60">
            <span className="font-medium text-white/80">{jobTitle}</span> will be restored to{' '}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStageStyles(restoreTargetStage)}`}>
              {restoreTargetStage}
            </span>
            {' '}and become active again.
          </p>
        )}

        {isArchive && (
          <div className="mt-4">
            <label
              htmlFor="archive-note"
              className="block text-xs font-medium uppercase tracking-wider text-white/50"
            >
              Note (optional)
            </label>
            <textarea
              id="archive-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Position was filled, withdrew application"
              className="
                mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] p-3
                text-sm text-white/80 placeholder-white/30
                focus:border-white/20 focus:outline-none
              "
            />
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-300" role="alert">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="
              rounded-lg border border-white/10 px-4 py-2
              text-sm text-white/70
              hover:bg-white/5 hover:text-white disabled:opacity-50 transition
            "
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`
              rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 transition
              ${isArchive
                ? 'border border-white/10 bg-white/[0.06] text-white/80 hover:bg-white/10'
                : 'border border-green-500/30 bg-green-500/20 text-green-200 hover:bg-green-500/30'}
            `}
          >
            {isSubmitting
              ? 'Saving…'
              : isArchive ? 'Archive' : 'Restore'}
          </button>
        </div>
      </div>
    </>
  );
}

ArchiveJobDialog.propTypes = {
  mode: PropTypes.oneOf(['archive', 'restore']).isRequired,
  jobTitle: PropTypes.string.isRequired,
  restoreTargetStage: PropTypes.string,
  isSubmitting: PropTypes.bool,
  error: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
