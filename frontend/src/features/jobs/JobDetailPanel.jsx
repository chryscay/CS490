import { useState } from 'react';
import PropTypes from 'prop-types';
import { getStageStyles } from './stageStyles';
import DeleteJobDialog from './DeleteJobDialog';


function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function buildTimeline(job) {
  const events = [];

  if (job.createdAt) {
    events.push({
      id: 'created',
      label: 'Job added',
      stage: 'Interested',
      date: job.createdAt,
    });
  }

  if (job.lastActivityAt && job.lastActivityAt !== job.createdAt) {
    events.push({
      id: 'last-activity',
      label: `Stage updated to ${job.stage}`,
      stage: job.stage,
      date: job.lastActivityAt,
    });
  }

  return events;
}

export default function JobDetailPanel({ job, onClose, onEdit, onDelete }) {
  const stageStyle = getStageStyles(job.stage);
  const timeline = buildTimeline(job);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Confirm -> call parent's async onDelete. On success the parent clears
  // selectedJob and this panel unmounts, so no need to reset local state.
  const handleConfirmDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await onDelete(job);
    } catch {
      setDeleting(false);
      setDeleteError('Could not delete this job. Please try again.');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-label="Job details"
        className="
          fixed right-0 top-0 h-full w-full max-w-lg
          bg-[#13131f] border-l border-white/10
          flex flex-col z-50
          overflow-y-auto
        "
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-white/10">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-white truncate">{job.title}</h2>
            <p className="mt-1 text-white/50">{job.company}</p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close job details"
            className="rounded-lg p-2 text-white/40 hover:text-white hover:bg-white/5 transition flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Stage + actions */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${stageStyle}`}>
            {job.stage}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(job)}
              aria-label={`Edit ${job.title}`}
              className="
                rounded-lg border border-white/10 px-4 py-2
                text-sm text-white/70
                hover:text-white hover:border-white/20 hover:bg-white/5
                transition
              "
            >
              Edit
            </button>

            <button
              onClick={() => setConfirmOpen(true)}
              aria-label={`Delete ${job.title}`}
              className="
                rounded-lg border border-red-500/30 px-4 py-2
                text-sm text-red-300
                hover:text-red-200 hover:border-red-500/40 hover:bg-red-500/10
                transition
              "
            >
              Delete
            </button>
          </div>
        </div>

        {/* Overview */}
        <div className="px-6 py-5 border-b border-white/10">
          <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-4">
            Overview
          </h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-white/40 uppercase tracking-wider">Title</dt>
              <dd className="text-sm text-white/80 mt-1">{job.title}</dd>
            </div>

            <div>
              <dt className="text-xs text-white/40 uppercase tracking-wider">Company</dt>
              <dd className="text-sm text-white/80 mt-1">{job.company}</dd>
            </div>

            <div>
              <dt className="text-xs text-white/40 uppercase tracking-wider">Stage</dt>
              <dd className="text-sm text-white/80 mt-1">{job.stage}</dd>
            </div>

            {job.deadline && (
              <div>
                <dt className="text-xs text-white/40 uppercase tracking-wider">Deadline</dt>
                <dd className="text-sm text-white/80 mt-1">{formatDate(job.deadline)}</dd>
              </div>
            )}

            {job.recruiterName && (
              <div>
                <dt className="text-xs text-white/40 uppercase tracking-wider">Recruiter / Contact</dt>
                <dd className="text-sm text-white/80 mt-1">{job.recruiterName}</dd>
              </div>
            )}

            {job.contactNotes && (
              <div>
                <dt className="text-xs text-white/40 uppercase tracking-wider">Contact Notes</dt>
                <dd className="text-sm text-white/80 mt-1">{job.contactNotes}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Job Posting Body */}
        {job.jobPostingBody && (
          <div className="px-6 py-5 border-b border-white/10">
            <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">
              Job Posting
            </h3>
            <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">
              {job.jobPostingBody}
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="px-6 py-5">
          <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-4">
            Timeline
          </h3>

          {timeline.length === 0 ? (
            <p className="text-white/30 text-sm">No activity recorded yet.</p>
          ) : (
            <ol aria-label="Job activity timeline" className="relative border-l border-white/10 space-y-6 ml-2">
              {timeline.map((event) => (
                <li key={event.id} className="pl-5 relative">
                  <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-white/20 border border-white/30" />
                  <p className="text-sm text-white/80">{event.label}</p>
                  <p className="text-xs text-white/35 mt-0.5">{formatDate(event.date)}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {confirmOpen && (
        <DeleteJobDialog
          jobTitle={job.title}
          isSubmitting={deleting}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setConfirmOpen(false);
            setDeleteError('');
          }}
        />
      )}
    </>
  );
}

JobDetailPanel.propTypes = {
  job: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string.isRequired,
    company: PropTypes.string.isRequired,
    stage: PropTypes.string.isRequired,
    jobPostingBody: PropTypes.string,
    createdAt: PropTypes.string,
    lastActivityAt: PropTypes.string,
    deadline: PropTypes.string,
    recruiterName: PropTypes.string,
    contactNotes: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};