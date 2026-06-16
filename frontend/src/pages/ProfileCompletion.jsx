import PropTypes from 'prop-types';

// Profile completion reflects the baseline REQUIRED fields only (S1-BR-011).
const REQUIRED_FIELDS = ['fullName', 'summary'];

export default function ProfileCompletion({ profile }) {
  const completed = REQUIRED_FIELDS.filter(
    (field) => (profile[field] ?? '').trim().length > 0
  ).length;

  const percentage = (completed / REQUIRED_FIELDS.length) * 100;

  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white">
          Profile Completion
        </span>

        <span className="text-sm font-medium text-blue-400">
          {completed}/{REQUIRED_FIELDS.length}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

ProfileCompletion.propTypes = {
  profile: PropTypes.shape({
    fullName: PropTypes.string,
    phone: PropTypes.string,
    location: PropTypes.string,
    summary: PropTypes.string,
  }).isRequired,
};
