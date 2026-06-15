import PropTypes from 'prop-types';

// Profile completion reflects the baseline REQUIRED fields only (S1-BR-011).
// These match the form's validation: fullName + summary.
const REQUIRED_FIELDS = ['fullName', 'summary'];

export default function ProfileCompletion({ profile }) {
  const completed = REQUIRED_FIELDS.filter(
    (field) => (profile[field] ?? '').trim().length > 0
  ).length;

  return (
    <p className="profile-completion">
      {completed} of {REQUIRED_FIELDS.length} fields complete
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