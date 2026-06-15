import './JobCard.css';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function JobCard({ job }) {
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
