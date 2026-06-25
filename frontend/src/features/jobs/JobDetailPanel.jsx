import { useState } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../auth/useAuth';
import { generateJobDraft } from './jobsApi';
import { getStageStyles, isOutcomeStage } from './stageStyles';
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

// S2-013: the most recent history entry that landed in the current outcome
// stage. stageHistory is absent on older jobs and pre-SCRUM-46 — guard it.
function latestOutcomeEntry(job) {
  if (!isOutcomeStage(job.stage)) return null;
  const history = job.stageHistory ?? [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i].toStage === job.stage) return history[i];
  }
  return null;
}

export default function JobDetailPanel({ job, onClose, onEdit, onDelete }) {
  const stageStyle = getStageStyles(job.stage);
  const timeline = buildTimeline(job);
  const outcome = latestOutcomeEntry(job);

  const { currentUser } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [draftText, setDraftText] = useState('');
  const [draftVisible, setDraftVisible] = useState(false);

  const handleGenerateDraft = async () => {
    setDraftError('');
    setDraftLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const result = await generateJobDraft(job._id, token, { type: 'resume' });
      setDraftText(result.draft);
      setDraftVisible(true);
    } catch (error) {
      setDraftError(error.message || 'Could not generate resume draft');
    } finally {
      setDraftLoading(false);
    }
  };

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
              onClick={handleGenerateDraft}
              disabled={draftLoading}
              aria-label={`Generate resume draft for ${job.title}`}
              className="
                rounded-lg border border-white/10 px-4 py-2
                text-sm text-white/70
                hover:text-white hover:border-white/20 hover:bg-white/5
                transition
                disabled:cursor-not-allowed disabled:text-white/30
              "
            >
              {draftLoading ? 'Generating...' : 'Generate resume draft'}
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

        {/* Outcome (S2-013) */}
        {outcome && (
          <div className="px-6 py-5 border-b border-white/10">
            <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-4">
              Outcome
            </h3>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStageStyles(outcome.toStage)}`}>
                {outcome.toStage}
              </span>
              <span className="text-xs text-white/35">{formatDate(outcome.changedAt)}</span>
            </div>
            {outcome.note ? (
              <p className="mt-3 text-sm text-white/80 whitespace-pre-wrap">{outcome.note}</p>
            ) : (
              <p className="mt-3 text-sm text-white/30">No outcome note recorded.</p>
            )}
          </div>
        )}

        {/* Generated resume draft */}
        {draftVisible && (
          <div className="px-6 py-5 border-b border-white/10">
            <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">
              Resume Draft
            </h3>
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={12}
              aria-label="Editable resume draft"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-2 text-xs text-white/40">
              This draft can be edited before a later save flow is added.
            </p>
          </div>
        )}

        {draftError && (
          <div className="px-6 py-3 text-sm text-red-300">
            {draftError}
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
    stageHistory: PropTypes.arrayOf(
      PropTypes.shape({
        toStage: PropTypes.string,
        note: PropTypes.string,
        changedAt: PropTypes.string,
      })
    ),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};