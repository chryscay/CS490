import PropTypes from 'prop-types';

export default function DeleteJobDialog({
  jobTitle,
  onConfirm,
  onCancel,
  isSubmitting,
  error,
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
        aria-label="Confirm delete job"
        className="fixed left-1/2 top-1/2 z-[70] w-full max-w-md -translate-x-1/2 -translate-y-1/2
                   rounded-2xl border border-white/10 bg-[#13131f] p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-white">Delete this job?</h2>
        <p className="mt-2 text-sm text-white/60">
          <span className="text-white/80">{jobTitle}</span> will be permanently
          removed, along with its history. This can&apos;t be undone.
        </p>

        {error && (
          <p className="mt-3 text-sm text-red-300" role="alert">
            {error}
          </p>
        )}

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
            className="rounded-lg border border-red-500/30 bg-red-500/20 px-4 py-2 text-sm font-medium
                       text-red-200 hover:bg-red-500/30 disabled:opacity-50 transition"
          >
            {isSubmitting ? 'Deleting…' : 'Delete job'}
          </button>
        </div>
      </div>
    </>
  );
}

DeleteJobDialog.propTypes = {
  jobTitle: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
  error: PropTypes.string,
};