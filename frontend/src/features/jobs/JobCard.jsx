import PropTypes from 'prop-types';
import './JobCard.css';

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

function JobCard({ job }) {
  const stageClass = `job-stage stage--${job.stage.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <li className="job-card">
      <div className="job-card-header">
        <span className="job-title">{job.title}</span>
        <span className={stageClass}>{job.stage}</span>
      </div>
      <span className="job-company">{job.company}</span>
      <div className="job-card-footer">
        <span className="job-last-activity">Last activity: {formatDate(job.lastActivityAt)}</span>
      </div>
    </li>
  );
}

JobCard.propTypes = {
  job: PropTypes.shape({
    title: PropTypes.string.isRequired,
    company: PropTypes.string.isRequired,
    stage: PropTypes.string.isRequired,
    lastActivityAt: PropTypes.string.isRequired,
  }).isRequired,
};

export default JobCard;
