import { useState } from 'react';
import PropTypes from 'prop-types';

function toInputValue(isoStr) {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export default function FollowUpForm({ followUp, onSave, onClose, isSubmitting, error }) {
  const isEdit = Boolean(followUp);

  const [title, setTitle] = useState(followUp?.title ?? '');
  const [dueAt, setDueAt] = useState(toInputValue(followUp?.dueAt));
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setValidationError('Title is required.');
      return;
    }
    if (!dueAt) {
      setValidationError('Due date and time are required.');
      return;
    }
    setValidationError('');
    onSave({ title: title.trim(), dueAt: new Date(dueAt).toISOString() });
  };

  const fieldClass = `
    w-full rounded-xl border border-white/10 bg-white/5
    px-4 py-3 text-sm text-white
    focus:outline-none focus:ring-2 focus:ring-blue-500
  `;

  const displayError = validationError || error;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[60]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-label={isEdit ? 'Edit follow-up' : 'Add follow-up'}
        className="
          fixed left-1/2 top-1/2 z-[70] w-full max-w-md
          -translate-x-1/2 -translate-y-1/2
          rounded-2xl border border-white/10 bg-[#13131f] p-6 shadow-xl
        "
      >
        <h2 className="text-lg font-semibold text-white mb-6">
          {isEdit ? 'Edit Follow-up' : 'Add Follow-up'}
        </h2>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label
              htmlFor="followup-title"
              className="block text-xs font-medium uppercase tracking-wider text-white/50 mb-2"
            >
              Title
            </label>
            <input
              id="followup-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Send thank you email"
              className={`${fieldClass} placeholder-white/30`}
            />
          </div>

          <div>
            <label
              htmlFor="followup-due-at"
              className="block text-xs font-medium uppercase tracking-wider text-white/50 mb-2"
            >
              Due Date &amp; Time
            </label>
            <input
              id="followup-due-at"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className={fieldClass}
            />
          </div>

          {displayError && (
            <p className="text-sm text-red-300" role="alert">
              {displayError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="
                rounded-lg border border-white/10 px-4 py-2
                text-sm text-white/70
                hover:text-white hover:bg-white/5
                disabled:opacity-50 transition
              "
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="
                rounded-lg bg-blue-600 px-4 py-2
                text-sm font-medium text-white
                hover:bg-blue-500 disabled:opacity-50 transition
              "
            >
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add follow-up'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

FollowUpForm.propTypes = {
  followUp: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    dueAt: PropTypes.string,
  }),
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
  error: PropTypes.string,
};
