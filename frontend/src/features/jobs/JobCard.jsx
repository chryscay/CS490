import PropTypes from 'prop-types';
//import { getStageStyles } from './stageStyles';
import StageControl from './StageControl';

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

function JobCard({ job, onEdit, onSelect, transition, onTransitioned }) {
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
        <button
          type="button"
          onClick={() => onSelect?.(job)}
          aria-label={`View details for ${job.title}`}
          className="
            flex-1
            text-left
            cursor-pointer
            rounded-xl
            focus:outline-none
            focus-visible:ring-2
            focus-visible:ring-blue-500
          "
        >
          <h3 className="text-lg font-semibold text-white">{job.title}</h3>

          <p className="mt-1 text-white/60">{job.company}</p>

          {job.deadline && (
            <p className="mt-2 text-sm text-white/50">
              Deadline: {formatDate(job.deadline)}
            </p>
          )}

          {job.recruiterName && (
            <p className="mt-2 text-sm text-white/50">
              Contact: {job.recruiterName}
            </p>
          )}

          {job.contactNotes && (
            <p className="mt-2 text-sm text-white/50">
              Notes: {job.contactNotes}
            </p>
          )}
        </button>

        <div className="flex items-center gap-3">
          <StageControl
            job={job}
            transition={transition}
            onTransitioned={onTransitioned}
          />

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
    deadline: PropTypes.string,
    recruiterName: PropTypes.string,
    contactNotes: PropTypes.string,
  }).isRequired,
  onEdit: PropTypes.func,
  onSelect: PropTypes.func,
  transition: PropTypes.func.isRequired,
  onTransitioned: PropTypes.func.isRequired,
};

export default JobCard;