import { useState } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../auth/useAuth';
import { generateJobDraft } from './jobsApi';
import { getStageStyles, isOutcomeStage } from './stageStyles';
import DeleteJobDialog from './DeleteJobDialog';
import ArchiveJobDialog from './ArchiveJobDialog';
import InterviewForm from './InterviewForm';
import FollowUpForm from './FollowUpForm';

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

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// S2-BR-013: include stage transitions (from stageHistory) and follow-up
// activity events, all sorted chronologically.
function buildTimeline(job) {
  const events = [];

  if (job.createdAt) {
    events.push({ id: 'created', label: 'Job added', date: job.createdAt });
  }

  const stageHistory = job.stageHistory ?? [];
  if (stageHistory.length > 0) {
    stageHistory.forEach((entry) => {
      events.push({
        id: `stage-${entry.id}`,
        label: `Moved to ${entry.toStage}`,
        date: entry.changedAt,
      });
    });
  } else if (job.lastActivityAt && job.lastActivityAt !== job.createdAt) {
    // Fallback for jobs created before stageHistory was implemented
    events.push({
      id: 'last-activity',
      label: `Stage updated to ${job.stage}`,
      date: job.lastActivityAt,
    });
  }

  (job.followUps ?? []).forEach((fu) => {
    events.push({
      id: `followup-created-${fu.id}`,
      label: `Follow-up added: ${fu.title}`,
      date: fu.createdAt,
    });
    if (fu.completedAt) {
      events.push({
        id: `followup-completed-${fu.id}`,
        label: `Follow-up completed: ${fu.title}`,
        date: fu.completedAt,
      });
    }
  });

  return events.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// S2-013: the most recent history entry that landed in the current outcome stage.
function latestOutcomeEntry(job) {
  if (!isOutcomeStage(job.stage)) return null;
  const history = job.stageHistory ?? [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i].toStage === job.stage) return history[i];
  }
  return null;
}

export default function JobDetailPanel({
  job,
  onClose,
  onEdit,
  onDelete,
  onAddInterview,
  onUpdateInterview,
  onAddFollowUp,
  onUpdateFollowUp,
  onArchive,
  onRestore,
}) {
  const stageStyle = getStageStyles(job.stage);
  const timeline = buildTimeline(job);
  const outcome = latestOutcomeEntry(job);
  const interviews = job.interviews ?? [];
  const followUps = job.followUps ?? [];

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

  const [interviewFormOpen, setInterviewFormOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState(null);
  const [interviewSubmitting, setInterviewSubmitting] = useState(false);
  const [interviewError, setInterviewError] = useState('');

  const [followUpFormOpen, setFollowUpFormOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState(null);
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);
  const [followUpError, setFollowUpError] = useState('');

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveDialogMode, setArchiveDialogMode] = useState('archive');
  const [archiveSubmitting, setArchiveSubmitting] = useState(false);
  const [archiveError, setArchiveError] = useState('');

  // Compute the stage a restore would land on from stageHistory.
  const restoreTargetStage = (() => {
    const history = job.stageHistory ?? [];
    const last = [...history].reverse().find((e) => e.toStage === 'Archived');
    return last?.fromStage ?? 'Interested';
  })();

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

  const handleArchiveConfirm = async (note) => {
    setArchiveSubmitting(true);
    setArchiveError('');
    try {
      if (archiveDialogMode === 'archive') {
        await onArchive(note);
      } else {
        await onRestore();
      }
      setArchiveDialogOpen(false);
    } catch (err) {
      setArchiveError(err.message || `Could not ${archiveDialogMode} job. Please try again.`);
    } finally {
      setArchiveSubmitting(false);
    }
  };

  const openAddInterview = () => {
    setEditingInterview(null);
    setInterviewError('');
    setInterviewFormOpen(true);
  };

  const openEditInterview = (interview) => {
    setEditingInterview(interview);
    setInterviewError('');
    setInterviewFormOpen(true);
  };

  const handleInterviewSave = async (entry) => {
    setInterviewSubmitting(true);
    setInterviewError('');
    try {
      if (editingInterview) {
        await onUpdateInterview(editingInterview.id, entry);
      } else {
        await onAddInterview(entry);
      }
      setInterviewFormOpen(false);
      setEditingInterview(null);
    } catch (err) {
      setInterviewError(err.message || 'Could not save interview. Please try again.');
    } finally {
      setInterviewSubmitting(false);
    }
  };

  const openAddFollowUp = () => {
    setEditingFollowUp(null);
    setFollowUpError('');
    setFollowUpFormOpen(true);
  };

  const openEditFollowUp = (fu) => {
    setEditingFollowUp(fu);
    setFollowUpError('');
    setFollowUpFormOpen(true);
  };

  const handleFollowUpSave = async (entry) => {
    setFollowUpSubmitting(true);
    setFollowUpError('');
    try {
      if (editingFollowUp) {
        await onUpdateFollowUp(editingFollowUp.id, {
          ...entry,
          completedAt: editingFollowUp.completedAt ?? null,
        });
      } else {
        await onAddFollowUp(entry);
      }
      setFollowUpFormOpen(false);
      setEditingFollowUp(null);
    } catch (err) {
      setFollowUpError(err.message || 'Could not save follow-up. Please try again.');
    } finally {
      setFollowUpSubmitting(false);
    }
  };

  const handleToggleComplete = async (fu) => {
    try {
      await onUpdateFollowUp(fu.id, {
        title: fu.title,
        dueAt: fu.dueAt,
        completedAt: fu.completedAt ? null : new Date().toISOString(),
      });
    } catch {
      // toggling is fire-and-forget; parent will surface errors if needed
    }
  };

  const sortedFollowUps = [...followUps].sort((a, b) => {
    // pending first, then sort by dueAt
    if (!a.completedAt && b.completedAt) return -1;
    if (a.completedAt && !b.completedAt) return 1;
    return new Date(a.dueAt) - new Date(b.dueAt);
  });

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

            {job.stage !== 'Archived' ? (
              <button
                onClick={() => { setArchiveDialogMode('archive'); setArchiveError(''); setArchiveDialogOpen(true); }}
                aria-label={`Archive ${job.title}`}
                className="
                  rounded-lg border border-white/10 px-4 py-2
                  text-sm text-white/60
                  hover:text-white hover:bg-white/5
                  transition
                "
              >
                Archive
              </button>
            ) : (
              <button
                onClick={() => { setArchiveDialogMode('restore'); setArchiveError(''); setArchiveDialogOpen(true); }}
                aria-label={`Restore ${job.title}`}
                className="
                  rounded-lg border border-green-500/30 px-4 py-2
                  text-sm text-green-300
                  hover:text-green-200 hover:border-green-500/40 hover:bg-green-500/10
                  transition
                "
              >
                Restore
              </button>
            )}
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

        {/* Interviews (S2-011) — only visible when stage is Interview */}
        {job.stage === 'Interview' && (
          <div className="px-6 py-5 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider">
                Interviews
              </h3>
              <button
                onClick={openAddInterview}
                aria-label="Add interview"
                className="
                  rounded-lg border border-white/10 px-3 py-1.5
                  text-xs text-white/60
                  hover:text-white hover:bg-white/5 transition
                "
              >
                + Add
              </button>
            </div>

            {interviews.length === 0 ? (
              <p className="text-sm text-white/30">No interviews recorded yet.</p>
            ) : (
              <ul aria-label="Interview list" className="space-y-4">
                {[...interviews]
                  .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
                  .map((iv) => (
                    <li key={iv.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white/80">{iv.roundType}</p>
                          <p className="text-xs text-white/40 mt-0.5">{formatDateTime(iv.scheduledAt)}</p>
                          <p className="text-sm text-white/60 mt-2 whitespace-pre-wrap">{iv.notes}</p>
                        </div>
                        <button
                          onClick={() => openEditInterview(iv)}
                          aria-label={`Edit ${iv.roundType} interview`}
                          className="
                            flex-shrink-0 rounded-lg border border-white/10 px-3 py-1.5
                            text-xs text-white/50 hover:text-white hover:bg-white/5 transition
                          "
                        >
                          Edit
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}

        {/* Follow-ups (S2-012) — always visible, tied to the job (S2-BR-012) */}
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider">
              Follow-ups
            </h3>
            <button
              onClick={openAddFollowUp}
              aria-label="Add follow-up"
              className="
                rounded-lg border border-white/10 px-3 py-1.5
                text-xs text-white/60
                hover:text-white hover:bg-white/5 transition
              "
            >
              + Add
            </button>
          </div>

          {followUps.length === 0 ? (
            <p className="text-sm text-white/30">No follow-ups yet.</p>
          ) : (
            <ul aria-label="Follow-up list" className="space-y-3">
              {sortedFollowUps.map((fu) => (
                <li key={fu.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleComplete(fu)}
                      aria-label={fu.completedAt ? `Mark "${fu.title}" incomplete` : `Mark "${fu.title}" complete`}
                      className={`
                        mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
                        transition
                        ${fu.completedAt
                          ? 'border-green-500 bg-green-500/20 text-green-400'
                          : 'border-white/30 hover:border-white/50'}
                      `}
                    >
                      {fu.completedAt && <span className="text-xs leading-none">✓</span>}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${fu.completedAt ? 'line-through text-white/30' : 'text-white/80'}`}>
                        {fu.title}
                      </p>
                      <p className="text-xs text-white/40 mt-0.5">
                        Due: {formatDateTime(fu.dueAt)}
                      </p>
                      {fu.completedAt && (
                        <p className="text-xs text-green-400/70 mt-0.5">
                          Completed: {formatDateTime(fu.completedAt)}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => openEditFollowUp(fu)}
                      aria-label={`Edit follow-up "${fu.title}"`}
                      className="
                        flex-shrink-0 rounded-lg border border-white/10 px-3 py-1.5
                        text-xs text-white/50 hover:text-white hover:bg-white/5 transition
                      "
                    >
                      Edit
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Timeline (S2-BR-013) — stage changes + follow-up activity in chronological order */}
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

      {archiveDialogOpen && (
        <ArchiveJobDialog
          mode={archiveDialogMode}
          jobTitle={job.title}
          restoreTargetStage={restoreTargetStage}
          isSubmitting={archiveSubmitting}
          error={archiveError}
          onConfirm={handleArchiveConfirm}
          onCancel={() => { setArchiveDialogOpen(false); setArchiveError(''); }}
        />
      )}

      {confirmOpen && (
        <DeleteJobDialog
          jobTitle={job.title}
          isSubmitting={deleting}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={() => { setConfirmOpen(false); setDeleteError(''); }}
        />
      )}

      {interviewFormOpen && (
        <InterviewForm
          interview={editingInterview}
          isSubmitting={interviewSubmitting}
          error={interviewError}
          onSave={handleInterviewSave}
          onClose={() => {
            setInterviewFormOpen(false);
            setEditingInterview(null);
            setInterviewError('');
          }}
        />
      )}

      {followUpFormOpen && (
        <FollowUpForm
          followUp={editingFollowUp}
          isSubmitting={followUpSubmitting}
          error={followUpError}
          onSave={handleFollowUpSave}
          onClose={() => {
            setFollowUpFormOpen(false);
            setEditingFollowUp(null);
            setFollowUpError('');
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
    stageHistory: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string,
      toStage: PropTypes.string,
      note: PropTypes.string,
      changedAt: PropTypes.string,
    })),
    interviews: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      roundType: PropTypes.string.isRequired,
      scheduledAt: PropTypes.string.isRequired,
      notes: PropTypes.string.isRequired,
    })),
    followUps: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      dueAt: PropTypes.string.isRequired,
      completedAt: PropTypes.string,
      createdAt: PropTypes.string,
    })),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onAddInterview: PropTypes.func,
  onUpdateInterview: PropTypes.func,
  onAddFollowUp: PropTypes.func,
  onUpdateFollowUp: PropTypes.func,
  onArchive: PropTypes.func,
  onRestore: PropTypes.func,
};
