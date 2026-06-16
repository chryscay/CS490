import PropTypes from 'prop-types';

function formatDate(dateStr) {
  if (!dateStr) return '-';

  const date = new Date(dateStr);

  if (isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStageStyles(stage) {
  switch (stage) {
    case 'Applied':
      return 'bg-blue-500/20 text-blue-300 border border-blue-500/20';

    case 'Interview':
      return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/20';

    case 'Offer':
      return 'bg-green-500/20 text-green-300 border border-green-500/20';

    case 'Hired':
      return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20';

    case 'Rejected':
      return 'bg-red-500/20 text-red-300 border border-red-500/20';

    default:
      return 'bg-white/10 text-white/70 border border-white/10';
  }
}

function JobCard({ job, onEdit }) {
  return (
    <li
      className="
        rounded-2xl
        border
        border-white/10
        bg-white/[0.03]
        p-5
        transition
        hover:border-white/20
        hover:bg-white/[0.05]
      "
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{job.title}</h3>

          <p className="mt-1 text-white/60">{job.company}</p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`
              rounded-full
              px-3
              py-1
              text-xs
              font-medium
              ${getStageStyles(job.stage)}
            `}
          >
            {job.stage}
          </span>

          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(job)}
              aria-label={`Edit ${job.title}`}
              className="
                rounded-lg
                border
                border-white/10
                px-3
                py-2
                text-sm
                text-white/70
                hover:text-white
                hover:border-white/20
                hover:bg-white/5
                transition
              "
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        <p className="text-sm text-white/40">
          Last activity: {formatDate(job.lastActivityAt)}
        </p>
      </div>
    </li>
  );
}

JobCard.propTypes = {
  job: PropTypes.shape({
    title: PropTypes.string.isRequired,
    company: PropTypes.string.isRequired,
    stage: PropTypes.string.isRequired,
    lastActivityAt: PropTypes.string,
  }).isRequired,
  onEdit: PropTypes.func,
};

export default JobCard;
