import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../auth/useAuth';
import { generateJobDraft, rewriteJobDraft, saveJobDocument, getJobDocuments, getAllDocuments, getDocument, linkDocumentToJob, unlinkDocumentFromJob } from './jobsApi';
import { exportJobDocument } from './documentsApi';
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

  (job.interviews ?? []).forEach((interview) => {
    events.push({
      id: `interview-${interview.id}`,
      label: `Interview: ${interview.roundType}`,
      date: interview.scheduledAt,
    });
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
  const [draftType, setDraftType] = useState('resume');
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [rewriteError, setRewriteError] = useState('');
  const [rewriteInstruction, setRewriteInstruction] = useState('');
  const [previousDraftText, setPreviousDraftText] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [savedDocs, setSavedDocs] = useState([]);
  const [exportingId, setExportingId] = useState('');
  const [exportError, setExportError] = useState('');

  // S3-009: linked documents state
  const [linkedDocs, setLinkedDocs] = useState({
    resume: job.linkedDocuments?.resume ? String(job.linkedDocuments.resume) : null,
    coverLetter: job.linkedDocuments?.coverLetter ? String(job.linkedDocuments.coverLetter) : null,
  });
  const [libraryDocs, setLibraryDocs] = useState([]);
  const [pickerType, setPickerType] = useState(null);
  const [pendingReplace, setPendingReplace] = useState(null);
  const [linkError, setLinkError] = useState('');
  const [docView, setDocView] = useState({ id: null, text: '', loading: false, error: '' });

  useEffect(() => {
    let cancelled = false;
    async function loadSavedDocs() {
      try {
        const token = await currentUser.getIdToken();
        const { documents } = await getJobDocuments(job._id, token);
        if (!cancelled) setSavedDocs(documents ?? []);
      } catch {
        // Non-blocking: if saved docs can't load, the panel still works.
        if (!cancelled) setSavedDocs([]);
      }
    }
    if (job._id && currentUser) loadSavedDocs();
    return () => {
      cancelled = true;
    };
  // Reload drafts when the job or signed-in user changes. Depend on
  // currentUser?.uid (stable) rather than the currentUser object, whose
  // identity can change each render and would re-fire this effect in a loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job._id, currentUser?.uid]);

  // Reset linked-docs UI and re-sync IDs whenever the displayed job changes.
  useEffect(() => {
    setLinkedDocs({
      resume: job.linkedDocuments?.resume ? String(job.linkedDocuments.resume) : null,
      coverLetter: job.linkedDocuments?.coverLetter ? String(job.linkedDocuments.coverLetter) : null,
    });
    setPickerType(null);
    setPendingReplace(null);
    setLinkError('');
    setDocView({ id: null, text: '', loading: false, error: '' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job._id]);

  // Load the user's full document library once per sign-in session.
  useEffect(() => {
    let cancelled = false;
    async function loadLibraryDocs() {
      try {
        const token = await currentUser.getIdToken();
        const { documents: docs } = await getAllDocuments(token);
        if (!cancelled) setLibraryDocs(docs ?? []);
      } catch {
        // Non-blocking: panel works without the library list.
      }
    }
    if (currentUser) loadLibraryDocs();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]);

  const handleGenerateDraft = async (type) => {
    if (rewriteLoading) {
      return;
    }

    setDraftError('');
    setRewriteError('');
    setRewriteInstruction('');
    setPreviousDraftText('');
    setSaveError('');
    setSaveMessage('');
    setDraftType(type);
    setDraftText('');
    setDraftVisible(false);
    setDraftLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const result = await generateJobDraft(job._id, token, { type });
      setDraftText(result.draft);
      setDraftVisible(true);
    } catch (error) {
      const fallbackMessage =
        type === 'coverLetter'
          ? 'Could not generate cover letter draft'
          : 'Could not generate resume draft';
      setDraftError(error.message || fallbackMessage);
    } finally {
      setDraftLoading(false);
    }
  };

  const handleRewriteDraft = async () => {
    setRewriteError('');
    setRewriteLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const currentDraftText = draftText;
      const result = await rewriteJobDraft(job._id, token, {
        type: draftType,
        text: currentDraftText,
        instruction: rewriteInstruction,
      });
      setPreviousDraftText(currentDraftText);
      setDraftText(result.draft);
      setSaveError('');
      setSaveMessage('');
    } catch (error) {
      setRewriteError(error.message || 'Could not improve draft');
    } finally {
      setRewriteLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!draftText.trim()) {
      return;
    }

    setSaveLoading(true);
    setSaveError('');
    setSaveMessage('');

    try {
      const token = await currentUser.getIdToken();
      const fallbackTitle =
        draftType === 'coverLetter'
          ? `${job.title} Cover Letter`
          : `${job.title} Resume`;
      const result = await saveJobDocument(job._id, token, {
        type: draftType,
        title: fallbackTitle,
        text: draftText,
      });

      if (result.document?.currentVersion) {
        setSaveMessage(`Saved as version ${result.document.currentVersion}`);
      } else {
        setSaveMessage('Draft saved');
      }
    } catch (error) {
      setSaveError(error.message || 'Could not save draft');
    } finally {
      setSaveLoading(false);
    }

  };


  const handleExport = async (doc) => {
    setExportError('');
    setExportingId(doc._id);
    try {
      const token = await currentUser.getIdToken();
      await exportJobDocument(job._id, doc._id, token, { format: 'pdf' });
    } catch (error) {
      setExportError(error.message || 'Could not export document');
    } finally {
      setExportingId('');
    }
  };

  


  // S3-009: link / unlink handlers
  const handleLink = async (type, documentId, newTitle, force = false) => {
    setLinkError('');
    try {
      const token = await currentUser.getIdToken();
      const result = await linkDocumentToJob(token, job._id, { type, documentId, confirmReplace: force });
      if (result.requiresConfirmation) {
        setPendingReplace({ type, documentId, newTitle, currentTitle: result.currentDocumentTitle });
        return;
      }
      setLinkedDocs((prev) => ({ ...prev, [type]: documentId }));
      setPickerType(null);
      setPendingReplace(null);
    } catch (err) {
      setLinkError(err.message || 'Failed to link document');
    }
  };

  const handleUnlink = async (type) => {
    setLinkError('');
    try {
      const token = await currentUser.getIdToken();
      await unlinkDocumentFromJob(token, job._id, type);
      setLinkedDocs((prev) => ({ ...prev, [type]: null }));
      setDocView((prev) => prev.id === linkedDocs[type] ? { id: null, text: '', loading: false, error: '' } : prev);
    } catch (err) {
      setLinkError(err.message || 'Failed to unlink document');
    }
  };

  // S3-010: toggle inline view of linked document's latest version text.
  const handleViewDoc = async (docId) => {
    if (docView.id === docId) {
      setDocView({ id: null, text: '', loading: false, error: '' });
      return;
    }
    setDocView({ id: docId, text: '', loading: true, error: '' });
    try {
      const token = await currentUser.getIdToken();
      const { document: doc } = await getDocument(token, docId);
      setDocView({ id: docId, text: doc.text ?? '', loading: false, error: '' });
    } catch (err) {
      setDocView({ id: docId, text: '', loading: false, error: err.message || 'Failed to load document' });
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
      setArchiveError(
        err.message || `Could not ${archiveDialogMode} job. Please try again.`
      );
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
      setInterviewError(
        err.message || 'Could not save interview. Please try again.'
      );
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
      setFollowUpError(
        err.message || 'Could not save follow-up. Please try again.'
      );
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
          bg-[#0e0e0e] border-l border-white/10
          flex flex-col z-50
          overflow-y-auto
        "
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-white/10">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-white truncate">
              {job.title}
            </h2>
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
        <div className="flex flex-col gap-2 px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium shrink-0 ${stageStyle}`}>
              {job.stage}
            </span>
            <button
              onClick={() => onEdit(job)}
              aria-label={`Edit ${job.title}`}
              className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white hover:border-white/20 hover:bg-white/5 transition"
            >
              Edit
            </button>
            {job.stage !== 'Archived' ? (
              <button
                onClick={() => { setArchiveDialogMode('archive'); setArchiveError(''); setArchiveDialogOpen(true); }}
                aria-label={`Archive ${job.title}`}
                className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition"
              >
                Archive
              </button>
            ) : (
              <button
                onClick={() => { setArchiveDialogMode('restore'); setArchiveError(''); setArchiveDialogOpen(true); }}
                aria-label={`Restore ${job.title}`}
                className="flex-1 rounded-lg border border-green-500/30 px-4 py-2 text-sm text-green-300 hover:text-green-200 hover:border-green-500/40 hover:bg-green-500/10 transition"
              >
                Restore
              </button>
            )}
            <button
              onClick={() => setConfirmOpen(true)}
              aria-label={`Delete ${job.title}`}
              className="flex-1 rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:text-red-200 hover:border-red-500/40 hover:bg-red-500/10 transition"
            >
              Delete
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleGenerateDraft('resume')}
              disabled={draftLoading || rewriteLoading}
              aria-label={`Generate resume draft for ${job.title}`}
              className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white hover:border-white/20 hover:bg-white/5 transition disabled:cursor-not-allowed disabled:text-white/30"
            >
              {draftLoading ? 'Generating...' : 'Generate resume draft'}
            </button>
            <button
              onClick={() => handleGenerateDraft('coverLetter')}
              disabled={draftLoading || rewriteLoading}
              aria-label={`Generate cover letter draft for ${job.title}`}
              className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white hover:border-white/20 hover:bg-white/5 transition disabled:cursor-not-allowed disabled:text-white/30"
            >
              {draftLoading ? 'Generating...' : 'Generate cover letter draft'}
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
              <dt className="text-xs text-white/40 uppercase tracking-wider">
                Title
              </dt>
              <dd className="text-sm text-white/80 mt-1">{job.title}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/40 uppercase tracking-wider">
                Company
              </dt>
              <dd className="text-sm text-white/80 mt-1">{job.company}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/40 uppercase tracking-wider">
                Stage
              </dt>
              <dd className="text-sm text-white/80 mt-1">{job.stage}</dd>
            </div>
            {job.deadline && (
              <div>
                <dt className="text-xs text-white/40 uppercase tracking-wider">
                  Deadline
                </dt>
                <dd className="text-sm text-white/80 mt-1">
                  {formatDate(job.deadline)}
                </dd>
              </div>
            )}
            {job.recruiterName && (
              <div>
                <dt className="text-xs text-white/40 uppercase tracking-wider">
                  Recruiter / Contact
                </dt>
                <dd className="text-sm text-white/80 mt-1">
                  {job.recruiterName}
                </dd>
              </div>
            )}
            {job.contactNotes && (
              <div>
                <dt className="text-xs text-white/40 uppercase tracking-wider">
                  Contact Notes
                </dt>
                <dd className="text-sm text-white/80 mt-1">
                  {job.contactNotes}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Linked Documents (S3-009) */}
        <div className="px-6 py-5 border-b border-white/10">
          <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-4">
            Linked Documents
          </h3>

          {linkError && (
            <p className="text-xs text-red-400 mb-3">{linkError}</p>
          )}

          {pendingReplace && (
            <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm text-amber-200">
                Replace <span className="font-medium">{pendingReplace.currentTitle}</span> with{' '}
                <span className="font-medium">{pendingReplace.newTitle}</span>?
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleLink(pendingReplace.type, pendingReplace.documentId, pendingReplace.newTitle, true)}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500 transition"
                >
                  Replace
                </button>
                <button
                  onClick={() => { setPendingReplace(null); setPickerType(null); }}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/5 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {['resume', 'coverLetter'].map((type) => {
            const linkedId = linkedDocs[type];
            const linkedDoc = libraryDocs.find((d) => String(d._id) === linkedId);
            const linkedTitle = linkedDoc?.title ?? (linkedId ? 'Linked document' : null);
            const label = type === 'resume' ? 'Resume' : 'Cover Letter';

            return (
              <div key={type} className="mb-3 last:mb-0">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">{label}</p>
                {linkedTitle ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03]">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <span className="text-sm text-white/80 truncate">{linkedTitle}</span>
                        {linkedDoc && (
                          <span className="text-xs text-white/40 ml-2">
                            v{linkedDoc.currentVersion} · {formatDate(linkedDoc.updatedAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 shrink-0 ml-3">
                        <button
                          onClick={() => handleViewDoc(linkedId)}
                          aria-label={docView.id === linkedId ? `Hide ${label.toLowerCase()} text` : `View ${label.toLowerCase()} text`}
                          className="text-xs text-white/40 hover:text-blue-300 transition"
                        >
                          {docView.id === linkedId ? 'Hide' : 'View'}
                        </button>
                        <button
                          onClick={() => setPickerType(type)}
                          aria-label={`Change linked ${label.toLowerCase()}`}
                          className="text-xs text-white/40 hover:text-blue-300 transition"
                        >
                          Change
                        </button>
                        <button
                          onClick={() => handleUnlink(type)}
                          aria-label={`Unlink ${label.toLowerCase()}`}
                          className="text-xs text-white/40 hover:text-red-400 transition"
                        >
                          Unlink
                        </button>
                      </div>
                    </div>
                    {docView.id === linkedId && (
                      <div className="border-t border-white/10 px-4 pb-3">
                        {docView.loading && (
                          <p className="text-xs text-white/40 pt-3">Loading…</p>
                        )}
                        {docView.error && (
                          <p className="text-xs text-red-400 pt-3">{docView.error}</p>
                        )}
                        {!docView.loading && !docView.error && (
                          <pre
                            aria-label={`${label} document text`}
                            className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm text-white/70"
                          >
                            {docView.text}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3">
                    <span className="text-sm text-white/30">Not linked</span>
                    <button
                      onClick={() => setPickerType(type)}
                      aria-label={`Link ${label.toLowerCase()}`}
                      className="text-xs text-white/40 hover:text-blue-300 transition"
                    >
                      Link
                    </button>
                  </div>
                )}

                {pickerType === type && (
                  <div className="mt-2 rounded-xl border border-white/10 bg-[#0e0e0e] max-h-48 overflow-y-auto">
                    {libraryDocs.filter((d) => d.type === type && (d.status ?? 'active') === 'active').length === 0 ? (
                      <p className="text-xs text-white/40 px-4 py-3">
                        No {label.toLowerCase()}s in your library.
                      </p>
                    ) : (
                      <ul aria-label={`${label} picker`}>
                        {libraryDocs
                          .filter((d) => d.type === type && (d.status ?? 'active') === 'active')
                          .map((doc) => (
                            <li key={doc._id}>
                              <button
                                onClick={() => handleLink(type, String(doc._id), doc.title)}
                                className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition flex items-center justify-between"
                              >
                                <span className="truncate">{doc.title}</span>
                                <span className="text-xs text-white/30 ml-2 shrink-0">v{doc.currentVersion}</span>
                              </button>
                            </li>
                          ))}
                      </ul>
                    )}
                    <button
                      onClick={() => { setPickerType(null); setPendingReplace(null); }}
                      className="w-full text-center text-xs text-white/30 hover:text-white/60 transition py-2 border-t border-white/5"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
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
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${getStageStyles(outcome.toStage)}`}
              >
                {outcome.toStage}
              </span>
              <span className="text-xs text-white/35">
                {formatDate(outcome.changedAt)}
              </span>
            </div>
            {outcome.note ? (
              <p className="mt-3 text-sm text-white/80 whitespace-pre-wrap">
                {outcome.note}
              </p>
            ) : (
              <p className="mt-3 text-sm text-white/30">
                No outcome note recorded.
              </p>
            )}
          </div>
        )}

        {/* Saved drafts (SCRUM-XX) — reload persisted document versions */}
        {savedDocs.length > 0 && (
          <div className="px-6 py-5 border-b border-white/10">
            <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">
              Saved Drafts
            </h3>
            {exportError && (
                <p className="text-xs text-red-400 mb-3">{exportError}</p>
              )} 
            <ul className="space-y-3">
              {savedDocs.map((doc) => (
                <li
                  key={doc._id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/80">
                      {doc.title}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {doc.type === 'coverLetter' ? 'Cover Letter' : 'Resume'} ·
                      version {doc.currentVersion}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setDraftType(doc.type);
                          setDraftText(doc.text);
                          setDraftVisible(true);
                          setDraftError('');
                          setSaveError('');
                          setSaveMessage('');
                        }}
                        aria-label={`Load saved ${doc.type} draft`}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/5 transition"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleExport(doc)}
                        disabled={exportingId === doc._id}
                        aria-label={`Download saved ${doc.type} as PDF`}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/5 transition disabled:cursor-not-allowed disabled:text-white/30"
                      >
                        {exportingId === doc._id ? 'Downloading...' : 'Download'}
                      </button>
                    </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Generated AI draft */}
        {draftVisible && (
          <div className="px-6 py-5 border-b border-white/10">
            <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">
              {draftType === 'coverLetter'
                ? 'Cover Letter Draft'
                : 'Resume Draft'}
            </h3>
            <textarea
              value={draftText}
              onChange={(e) => {
                setDraftText(e.target.value);
                setSaveError('');
                setSaveMessage('');
              }}
              disabled={rewriteLoading}
              rows={12}
              aria-label={
                draftType === 'coverLetter'
                  ? 'Editable cover letter draft'
                  : 'Editable resume draft'
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-2 text-xs text-white/40">
              Edit this draft, then click Save draft to store a version linked
              to this job.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs text-white/50 uppercase tracking-wider">
                  Improve instruction
                </span>
                <textarea
                  value={rewriteInstruction}
                  onChange={(e) => setRewriteInstruction(e.target.value)}
                  disabled={rewriteLoading}
                  rows={3}
                  aria-label="Rewrite instruction"
                  placeholder="Example: Make this more concise and results-focused for a backend role."
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleRewriteDraft}
                  disabled={rewriteLoading || saveLoading}
                  className="
                    rounded-lg border border-white/10 px-4 py-2
                    text-sm text-white/70
                    hover:text-white hover:border-white/20 hover:bg-white/5
                    transition
                    disabled:cursor-not-allowed disabled:text-white/30
                  "
                >
                  {rewriteLoading ? 'Improving...' : 'Improve draft'}
                </button>
                <button
                  onClick={handleSaveDraft}
                  disabled={
                    draftLoading ||
                    rewriteLoading ||
                    saveLoading ||
                    !draftText.trim()
                  }
                  className="
                    rounded-lg border border-white/10 px-4 py-2
                    text-sm text-white/70
                    hover:text-white hover:border-white/20 hover:bg-white/5
                    transition
                    disabled:cursor-not-allowed disabled:text-white/30
                  "
                >
                  {saveLoading ? 'Saving...' : 'Save draft'}
                </button>
                <p className="text-xs text-white/40">
                  Improves only after you click.
                </p>
              </div>

              {rewriteError && (
                <p className="text-sm text-red-300">{rewriteError}</p>
              )}
              {saveError && <p className="text-sm text-red-300">{saveError}</p>}
              {saveMessage && (
                <p className="text-sm text-green-300">{saveMessage}</p>
              )}
            </div>

            {previousDraftText && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider">
                  Previous draft for comparison
                </h4>
                <pre className="mt-2 whitespace-pre-wrap text-sm text-white/60">
                  {previousDraftText}
                </pre>
              </div>
            )}
          </div>
        )}

        {draftError && (
          <div className="px-6 py-3 text-sm text-red-300">{draftError}</div>
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
              <p className="text-sm text-white/30">
                No interviews recorded yet.
              </p>
            ) : (
              <ul aria-label="Interview list" className="space-y-4">
                {[...interviews]
                  .sort(
                    (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)
                  )
                  .map((iv) => (
                    <li
                      key={iv.id}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white/80">
                            {iv.roundType}
                          </p>
                          <p className="text-xs text-white/40 mt-0.5">
                            {formatDateTime(iv.scheduledAt)}
                          </p>
                          <p className="text-sm text-white/60 mt-2 whitespace-pre-wrap">
                            {iv.notes}
                          </p>
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
                <li
                  key={fu.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleComplete(fu)}
                      aria-label={
                        fu.completedAt
                          ? `Mark "${fu.title}" incomplete`
                          : `Mark "${fu.title}" complete`
                      }
                      className={`
                        mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
                        transition
                        ${
                          fu.completedAt
                            ? 'border-green-500 bg-green-500/20 text-green-400'
                            : 'border-white/30 hover:border-white/50'
                        }
                      `}
                    >
                      {fu.completedAt && (
                        <span className="text-xs leading-none">✓</span>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${fu.completedAt ? 'line-through text-white/30' : 'text-white/80'}`}
                      >
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
            <ol
              aria-label="Job activity timeline"
              className="relative border-l border-white/10 space-y-6 ml-2"
            >
              {timeline.map((event) => (
                <li key={event.id} className="pl-5 relative">
                  <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-white/20 border border-white/30" />
                  <p className="text-sm text-white/80">{event.label}</p>
                  <p className="text-xs text-white/35 mt-0.5">
                    {formatDate(event.date)}
                  </p>
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
          onCancel={() => {
            setArchiveDialogOpen(false);
            setArchiveError('');
          }}
        />
      )}

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
    linkedDocuments: PropTypes.shape({
      resume: PropTypes.string,
      coverLetter: PropTypes.string,
    }),
    stageHistory: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        toStage: PropTypes.string,
        note: PropTypes.string,
        changedAt: PropTypes.string,
      })
    ),
    interviews: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        roundType: PropTypes.string.isRequired,
        scheduledAt: PropTypes.string.isRequired,
        notes: PropTypes.string.isRequired,
      })
    ),
    followUps: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        dueAt: PropTypes.string.isRequired,
        completedAt: PropTypes.string,
        createdAt: PropTypes.string,
      })
    ),
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
