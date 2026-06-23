import PropTypes from 'prop-types';

export default function SectionCard({
  title, description, status, saveError, isDirty, onSubmit, children,
}) {
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label={title}
      className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 space-y-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-white/50">{description}</p>
          )}
        </div>
        {status === 'saved' && (
          <span
            role="status"
            className="whitespace-nowrap text-sm font-medium text-green-400"
          >
            Saved
          </span>
        )}
      </div>

      {status === 'error' && saveError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {saveError}
        </div>
      )}

      <div className="space-y-6">{children}</div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={status === 'saving' || !isDirty}
          className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          {status === 'saving' ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}

SectionCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  status: PropTypes.string.isRequired,
  saveError: PropTypes.string,
  isDirty: PropTypes.bool.isRequired,
  onSubmit: PropTypes.func.isRequired,
  children: PropTypes.node,
};