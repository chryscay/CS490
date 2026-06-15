import PropTypes from 'prop-types';

// Baseline profile fields counted toward completion (S1-BR-009).
// To count required fields only, change this to ['fullName', 'summary'].
const BASELINE_FIELDS = ['fullName', 'phone', 'location', 'summary'];

export default function ProfileCompletion({ profile }) {
  const completed = BASELINE_FIELDS.filter(
    (field) => (profile[field] ?? '').trim().length > 0
  ).length;

  return (
    <p className="profile-completion">
      {completed} of {BASELINE_FIELDS.length} fields complete
    </p>
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