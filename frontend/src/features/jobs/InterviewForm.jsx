import { useState } from 'react';
import PropTypes from 'prop-types';

export const ROUND_TYPES = [
  'Phone Screen',
  'HR Screen',
  'Technical Screen',
  'System Design',
  'Behavioral',
  'On-site',
  'Final Round',
];

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

export default function InterviewForm({ interview, onSave, onClose, isSubmitting, error }) {
  const isEdit = Boolean(interview);

  const [roundType, setRoundType] = useState(interview?.roundType ?? ROUND_TYPES[0]);
  const [scheduledAt, setScheduledAt] = useState(toInputValue(interview?.scheduledAt));
  const [notes, setNotes] = useState(interview?.notes ?? '');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!scheduledAt) {
      setValidationError('Date and time are required.');
      return;
    }
    if (!notes.trim()) {
      setValidationError('Notes are required.');
      return;
    }
    setValidationError('');
    onSave({
      roundType,
      scheduledAt: new Date(scheduledAt).toISOString(),
      notes: notes.trim(),
    });
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
        aria-label={isEdit ? 'Edit interview' : 'Add interview'}
        className="
          fixed left-1/2 top-1/2 z-[70] w-full max-w-lg
          -translate-x-1/2 -translate-y-1/2
          rounded-2xl border border-white/10 bg-[#13131f] p-6 shadow-xl
          max-h-[90vh] overflow-y-auto
        "
      >
        <h2 className="text-lg font-semibold text-white mb-6">
          {isEdit ? 'Edit Interview' : 'Add Interview'}
        </h2>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label
              htmlFor="interview-round-type"
              className="block text-xs font-medium uppercase tracking-wider text-white/50 mb-2"
            >
              Round Type
            </label>
            <select
              id="interview-round-type"
              value={roundType}
              onChange={(e) => setRoundType(e.target.value)}
              className={fieldClass}
            >
              {ROUND_TYPES.map((rt) => (
                <option key={rt} value={rt} className="bg-[#13131f]">
                  {rt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="interview-scheduled-at"
              className="block text-xs font-medium uppercase tracking-wider text-white/50 mb-2"
            >
              Date &amp; Time
            </label>
            <input
              id="interview-scheduled-at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label
              htmlFor="interview-notes"
              className="block text-xs font-medium uppercase tracking-wider text-white/50 mb-2"
            >
              Notes
            </label>
            <textarea
              id="interview-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Topics covered, questions asked, impressions…"
              className={`${fieldClass} resize-none placeholder-white/30`}
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
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add interview'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

InterviewForm.propTypes = {
  interview: PropTypes.shape({
    id: PropTypes.string,
    roundType: PropTypes.string,
    scheduledAt: PropTypes.string,
    notes: PropTypes.string,
  }),
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
  error: PropTypes.string,
};
