import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../features/auth/useAuth';
import { getAllDocuments, uploadDocument, renameDocument, duplicateDocument, archiveDocument, restoreDocument } from '../features/jobs/jobsApi';

const TYPE_LABEL = {
  resume: 'Resume',
  coverLetter: 'Cover Letter',
};

const TYPE_STYLE = {
  resume: 'bg-blue-500/10 text-blue-300 border border-blue-500/20',
  coverLetter: 'bg-purple-500/10 text-purple-300 border border-purple-500/20',
};

const ALLOWED_FILE_EXTENSIONS = ['pdf', 'docx', 'txt'];

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DocumentLibraryPage() {
  const { currentUser } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [sortDir, setSortDir] = useState('desc');
  const [uploadType, setUploadType] = useState('resume');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadJobId, setUploadJobId] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');

  async function loadDocuments(token) {
    const { documents: docs } = await getAllDocuments(token);
    setDocuments(docs);
  }

  useEffect(() => {
    if (!currentUser) return;
    currentUser.getIdToken().then((token) =>
      loadDocuments(token)
        .catch(() => setError('Could not load documents'))
        .finally(() => setLoading(false))
    );
  }, [currentUser]);

  function validateSelectedFile(file) {
    if (!file) {
      return 'Please choose a file to upload.';
    }

    const lowerName = file.name.toLowerCase();
    const extension = lowerName.includes('.') ? lowerName.split('.').pop() : '';
    if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
      return 'Unsupported file format. Supported formats are PDF, DOCX, and TXT.';
    }

    return '';
  }

  async function handleUpload(event) {
    event.preventDefault();
    setUploadError('');
    setUploadSuccess('');

    const fileValidationError = validateSelectedFile(uploadFile);
    if (fileValidationError) {
      setUploadError(fileValidationError);
      return;
    }

    setIsUploading(true);
    try {
      const token = await currentUser.getIdToken();
      await uploadDocument(token, {
        file: uploadFile,
        type: uploadType,
        title: uploadTitle,
        jobId: uploadJobId,
      });
      await loadDocuments(token);
      setUploadSuccess('Document uploaded successfully.');
      setUploadTitle('');
      setUploadJobId('');
      setUploadFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (uploadErr) {
      setUploadError(uploadErr?.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRename(documentId) {
    const trimmed = editingTitle.trim();
    const original = documents.find((d) => String(d._id) === String(documentId));
    setEditingId(null);
    if (!trimmed || trimmed === original?.title) return;
    try {
      const token = await currentUser.getIdToken();
      const { document: updated } = await renameDocument(token, documentId, trimmed);
      setDocuments((prev) =>
        prev.map((d) =>
          String(d._id) === String(documentId)
            ? { ...d, title: updated.title, updatedAt: updated.updatedAt }
            : d
        )
      );
    } catch {
      setActionError('Failed to rename document');
      setTimeout(() => setActionError(''), 4000);
    }
  }

  async function handleArchive(documentId) {
    setActionMsg('');
    setActionError('');
    try {
      const token = await currentUser.getIdToken();
      const { document: updated } = await archiveDocument(token, documentId);
      setDocuments((prev) =>
        prev.map((d) =>
          String(d._id) === String(documentId)
            ? { ...d, status: updated.status, updatedAt: updated.updatedAt }
            : d
        )
      );
    } catch {
      setActionError('Failed to archive document');
      setTimeout(() => setActionError(''), 4000);
    }
  }

  async function handleRestore(documentId) {
    setActionMsg('');
    setActionError('');
    try {
      const token = await currentUser.getIdToken();
      const { document: updated } = await restoreDocument(token, documentId);
      setDocuments((prev) =>
        prev.map((d) =>
          String(d._id) === String(documentId)
            ? { ...d, status: updated.status, updatedAt: updated.updatedAt }
            : d
        )
      );
    } catch {
      setActionError('Failed to restore document');
      setTimeout(() => setActionError(''), 4000);
    }
  }

  async function handleDuplicate(documentId) {
    setActionMsg('');
    setActionError('');
    try {
      const token = await currentUser.getIdToken();
      const { document: duped } = await duplicateDocument(token, documentId);
      setDocuments((prev) => [duped, ...prev]);
      setActionMsg('Document duplicated.');
      setTimeout(() => setActionMsg(''), 4000);
    } catch {
      setActionError('Failed to duplicate document');
      setTimeout(() => setActionError(''), 4000);
    }
  }

  const allTags = [...new Set(documents.flatMap((d) => d.tags ?? []))].sort();

  const visible = documents
    .filter((d) => !filterType || d.type === filterType)
    .filter((d) => !filterStatus || (d.status ?? 'active') === filterStatus)
    .filter((d) => !filterTag || (d.tags ?? []).includes(filterTag))
    .sort((a, b) =>
      sortDir === 'desc'
        ? new Date(b.updatedAt) - new Date(a.updatedAt)
        : new Date(a.updatedAt) - new Date(b.updatedAt)
    );

  const resumeCount = documents.filter((d) => d.type === 'resume').length;
  const coverLetterCount = documents.filter((d) => d.type === 'coverLetter').length;

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-4xl font-semibold text-white">Document Library</h1>
          <p className="mt-2 text-white/50">All your saved resumes and cover letters.</p>
        </div>
      </div>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 mb-6">
        <h2 className="text-xl font-semibold text-white">Upload Document</h2>
        <p className="text-sm text-white/50 mt-1">Accepted formats: PDF, DOCX, TXT</p>

        <form onSubmit={handleUpload} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-white/70">Document Type</span>
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
            >
              <option value="resume">Resume</option>
              <option value="coverLetter">Cover Letter</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-white/70">Title (optional)</span>
            <input
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="Senior Engineer Resume"
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white placeholder:text-white/30"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-white/70">Job ID (optional)</span>
            <input
              value={uploadJobId}
              onChange={(e) => setUploadJobId(e.target.value)}
              placeholder="Link to job if needed"
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white placeholder:text-white/30"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-white/70">File</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => {
                setUploadSuccess('');
                setUploadError('');
                setUploadFile(e.target.files?.[0] || null);
              }}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
            />
          </label>

          <div className="md:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={isUploading}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
            {uploadSuccess ? <p className="text-sm text-emerald-300">{uploadSuccess}</p> : null}
            {uploadError ? <p className="text-sm text-red-400">{uploadError}</p> : null}
          </div>
        </form>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-sm text-white/50">Resumes</p>
          <h2 className="text-4xl font-bold text-white mt-3">{resumeCount}</h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-sm text-white/50">Cover Letters</p>
          <h2 className="text-4xl font-bold text-white mt-3">{coverLetterCount}</h2>
        </div>
      </div>

      {/* Filters + sort */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Type */}
        {['', 'resume', 'coverLetter'].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            aria-label={t === '' ? 'All types' : TYPE_LABEL[t]}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm border transition ${
              filterType === t
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            {t === '' ? 'All' : TYPE_LABEL[t]}
          </button>
        ))}

        <div className="w-px h-5 bg-white/10 shrink-0" />

        {/* Status */}
        <select
          aria-label="Filter by status"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>

        {/* Tag */}
        <select
          aria-label="Filter by tag"
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All tags</option>
          {allTags.map((tag) => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>

        {/* Sort by updated date */}
        <select
          aria-label="Sort by date"
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value)}
          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="desc">Updated ↓</option>
          <option value="asc">Updated ↑</option>
        </select>
      </div>

      {/* Action feedback */}
      {(actionMsg || actionError) && (
        <div className="mb-4">
          {actionMsg && <p className="text-sm text-emerald-300">{actionMsg}</p>}
          {actionError && <p className="text-sm text-red-400">{actionError}</p>}
        </div>
      )}

      {/* List */}
      <section
        aria-label="Document library"
        className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 min-h-[300px]"
      >
        {loading ? (
          <div className="flex items-center justify-center py-20 text-white/50">
            Loading documents...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20 text-red-400">{error}</div>
        ) : visible.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-white/40 text-center">
              {documents.length === 0
                ? 'No documents yet. Generate a resume or cover letter draft from a job to get started.'
                : 'No documents match the selected filter.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((doc) => (
              <li
                key={doc._id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4"
              >
                <div className="flex items-center gap-3 min-w-0 flex-wrap">
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${TYPE_STYLE[doc.type] ?? ''}`}>
                    {TYPE_LABEL[doc.type] ?? doc.type}
                  </span>
                  {(doc.status ?? 'active') === 'archived' && (
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium bg-white/5 text-white/40 border border-white/10">
                      archived
                    </span>
                  )}
                  {editingId === String(doc._id) ? (
                    <input
                      ref={(el) => el?.focus()}
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => handleRename(doc._id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(doc._id);
                        if (e.key === 'Escape') { setEditingId(null); setEditingTitle(''); }
                      }}
                      aria-label="Rename document"
                      className="rounded-lg border border-white/20 bg-white/5 px-2 py-0.5 text-white font-medium text-sm w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  ) : (
                    <button
                      onClick={() => { setEditingId(String(doc._id)); setEditingTitle(doc.title); }}
                      aria-label={`Rename ${doc.title}`}
                      className="text-white font-medium truncate hover:text-blue-300 transition text-left"
                    >
                      {doc.title}
                    </button>
                  )}
                  {(doc.tags ?? []).map((tag) => (
                    <span key={tag} className="shrink-0 rounded-full px-2 py-0.5 text-xs bg-white/5 text-white/50 border border-white/10">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  {(doc.status ?? 'active') === 'active' ? (
                    <button
                      onClick={() => handleArchive(doc._id)}
                      aria-label={`Archive ${doc.title}`}
                      className="text-xs text-white/40 hover:text-amber-400 transition"
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRestore(doc._id)}
                      aria-label={`Restore ${doc.title}`}
                      className="text-xs text-white/40 hover:text-emerald-400 transition"
                    >
                      Restore
                    </button>
                  )}
                  <button
                    onClick={() => handleDuplicate(doc._id)}
                    aria-label={`Duplicate ${doc.title}`}
                    className="text-xs text-white/40 hover:text-white/80 transition"
                  >
                    Copy
                  </button>
                  <span className="text-xs text-white/40">v{doc.currentVersion}</span>
                  <span className="text-xs text-white/40">{formatDate(doc.updatedAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
