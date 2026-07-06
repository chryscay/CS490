import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/useAuth';
import { getAllDocuments } from '../features/jobs/jobsApi';

const TYPE_LABEL = {
  resume: 'Resume',
  coverLetter: 'Cover Letter',
};

const TYPE_STYLE = {
  resume: 'bg-blue-500/10 text-blue-300 border border-blue-500/20',
  coverLetter: 'bg-purple-500/10 text-purple-300 border border-purple-500/20',
};

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

  useEffect(() => {
    if (!currentUser) return;
    currentUser.getIdToken().then((token) =>
      getAllDocuments(token)
        .then(({ documents: docs }) => setDocuments(docs))
        .catch(() => setError('Could not load documents'))
        .finally(() => setLoading(false))
    );
  }, [currentUser]);

  const visible = filterType
    ? documents.filter((d) => d.type === filterType)
    : documents;

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

      {/* Filter */}
      <div className="flex items-center gap-3 mb-6">
        {['', 'resume', 'coverLetter'].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm border transition ${
              filterType === t
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            {t === '' ? 'All' : TYPE_LABEL[t]}
          </button>
        ))}
      </div>

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
                <div className="flex items-center gap-4 min-w-0">
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${TYPE_STYLE[doc.type] ?? ''}`}>
                    {TYPE_LABEL[doc.type] ?? doc.type}
                  </span>
                  <span className="text-white font-medium truncate">{doc.title}</span>
                </div>
                <div className="flex items-center gap-6 shrink-0 ml-4">
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
