import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/useAuth';
import JobCard from '../features/jobs/JobCard';
import JobFormModal from '../features/jobs/JobFormModal';
import JobDetailPanel from '../features/jobs/JobDetailPanel';
import {
  transitionStage,
  deleteJob,
  addInterview,
  updateInterview,
  addFollowUp,
  updateFollowUp,
  archiveJob,
  restoreJob,
} from '../features/jobs/jobsApi';
import { STAGES } from '../features/jobs/stageStyles';
import { applyFilters } from '../features/jobs/jobFilters';
import { sortJobs, SORT_OPTIONS } from '../features/jobs/jobSort';
import JobAnalytics from '../components/JobAnalytics.jsx';

export default function DashboardPage() {
  const { currentUser } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);

  const [filterStage, setFilterStage] = useState('');
  const [filterDeadlineState, setFilterDeadlineState] = useState('all');
  const [filterLocation, setFilterLocation] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('lastActivityAt');
  const [sortDir, setSortDir] = useState('desc');
  const [showArchived, setShowArchived] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [currentPage, setCurrentPage] = useState(1);
  const [analytics, setAnalytics] = useState(null);

  const loadJobs = () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    currentUser.getIdToken().then((token) => {
      fetch(`${import.meta.env.VITE_API_URL}/api/jobs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => setJobs(data.jobs ?? []))
        .catch(() => setJobs([]))
        .finally(() => setLoading(false));
    });
  };

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    filterStage,
    filterLocation,
    filterDeadlineState,
    searchTerm,
    sortBy,
    sortDir,
    showArchived,
    itemsPerPage,
  ]);

  useEffect(() => {
    async function fetchAnalytics() {
      if (!currentUser) {
        return;
      }

      const token = await currentUser.getIdToken();

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/jobs/analytics`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      setAnalytics(data);
    }

    fetchAnalytics();
  }, [currentUser]);
  const openCreate = () => {
    setEditingJob(null);
    setModalOpen(true);
  };

  const openEdit = (job) => {
    setSelectedJob(null);
    setEditingJob(job);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setModalOpen(false);
    setEditingJob(null);
    setLoading(true);
    loadJobs();
  };

  const makeTransition = (jobId) => async (toStage, options) => {
    const token = await currentUser.getIdToken();
    return transitionStage(jobId, toStage, token, options);
  };

  const handleTransitioned = (updatedJob) => {
    setJobs((prev) =>
      prev.map((j) => (j._id === updatedJob._id ? updatedJob : j))
    );
    setSelectedJob((prev) =>
      prev && prev._id === updatedJob._id ? updatedJob : prev
    );
  };

  const handleAddInterview = async (entry) => {
    const token = await currentUser.getIdToken();
    const { job } = await addInterview(selectedJob._id, entry, token);
    handleTransitioned(job);
  };

  const handleUpdateInterview = async (interviewId, entry) => {
    const token = await currentUser.getIdToken();
    const { job } = await updateInterview(
      selectedJob._id,
      interviewId,
      entry,
      token
    );
    handleTransitioned(job);
  };

  const handleAddFollowUp = async (entry) => {
    const token = await currentUser.getIdToken();
    const { job } = await addFollowUp(selectedJob._id, entry, token);
    handleTransitioned(job);
  };

  const handleUpdateFollowUp = async (followUpId, entry) => {
    const token = await currentUser.getIdToken();
    const { job } = await updateFollowUp(
      selectedJob._id,
      followUpId,
      entry,
      token
    );
    handleTransitioned(job);
  };

  const handleArchive = async (note) => {
    const token = await currentUser.getIdToken();
    const { job } = await archiveJob(selectedJob._id, note, token);
    handleTransitioned(job);
  };

  const handleRestore = async () => {
    const token = await currentUser.getIdToken();
    const { job } = await restoreJob(selectedJob._id, token);
    handleTransitioned(job);
  };

  const handleDelete = async (job) => {
    const token = await currentUser.getIdToken();
    await deleteJob(job._id, token);
    setJobs((prev) => prev.filter((j) => j._id !== job._id));
    setSelectedJob(null);
  };

  const hasActiveFilters =
    Boolean(filterStage) ||
    filterDeadlineState !== 'all' ||
    Boolean(filterLocation.trim());

  const clearFilters = () => {
    setFilterStage('');
    setFilterDeadlineState('all');
    setFilterLocation('');
  };

  const archivedCount = jobs.filter((j) => j.stage === 'Archived').length;

  const visibleJobs = sortJobs(
    applyFilters(jobs, {
      stage: filterStage,
      location: filterLocation,
      deadlineState: filterDeadlineState,
      search: searchTerm,
      showArchived,
    }),
    sortBy,
    sortDir
  );

  const totalPages = Math.max(1, Math.ceil(visibleJobs.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedJobs = visibleJobs.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  // SCRUM-62: stage counts + response tracking (S2-BR-022), computed from
  // persisted job records, not UI state (S2-BR-023). Fixes the prior 'Hired'
  // stat, which filtered a non-canonical stage and always read zero.
  const RESPONSE_STAGES = ['Interview', 'Offer', 'Rejected'];
  const countByStage = (stage) => jobs.filter((j) => j.stage === stage).length;
  const responseCount = jobs.filter((j) =>
    RESPONSE_STAGES.includes(j.stage)
  ).length;

  const stats = [
    { label: 'Total Jobs', value: jobs.length },
    { label: 'Applications', value: countByStage('Applied') },
    { label: 'Interviews', value: countByStage('Interview') },
    { label: 'Offers', value: countByStage('Offer') },
    { label: 'Responses', value: responseCount },
  ];

  const selectClass =
    'shrink-0 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="w-full">
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-4xl font-semibold text-white">Dashboard</h1>
          <p className="mt-2 text-white/50">
            Track your applications and job opportunities.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="
            rounded-xl
            bg-blue-600
            px-5
            py-3
            text-white
            font-medium
            hover:bg-blue-500
            transition
          "
        >
          + Add Job
        </button>
      </div>

      {/* Filter bar */}
      <div
        aria-label="Job filters"
        className="flex flex-wrap items-center gap-3 mb-8"
      >
        <input
          type="text"
          aria-label="Search jobs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search jobs..."
          className="w-36 shrink-0 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          aria-label="Filter by stage"
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className={selectClass}
        >
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s} className="bg-[#13131f]">
              {s}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by deadline"
          value={filterDeadlineState}
          onChange={(e) => setFilterDeadlineState(e.target.value)}
          className={selectClass}
        >
          <option value="all">All deadlines</option>
          <option value="has-deadline">Has deadline</option>
          <option value="no-deadline">No deadline</option>
          <option value="overdue">Overdue</option>
        </select>

        <input
          type="text"
          aria-label="Filter by location"
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          placeholder="Filter by location..."
          className="w-36 shrink-0 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={() => setShowArchived((prev) => !prev)}
          aria-label={
            showArchived ? 'Hide archived jobs' : 'Show archived jobs'
          }
          aria-pressed={showArchived}
          className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm transition whitespace-nowrap ${showArchived ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 bg-transparent text-white/50 hover:text-white hover:bg-white/5'}`}
        >
          {showArchived
            ? 'Hide archived'
            : `Show archived${archivedCount > 0 ? ` (${archivedCount})` : ''}`}
        </button>

        <select
          aria-label="Sort by"
          value={`${sortBy}|${sortDir}`}
          onChange={(e) => {
            const [field, dir] = e.target.value.split('|');
            setSortBy(field);
            setSortDir(dir);
          }}
          className={selectClass}
        >
          {SORT_OPTIONS.map((opt) => (
            <optgroup
              key={opt.value}
              label={opt.label}
              className="bg-[#13131f]"
            >
              <option value={`${opt.value}|desc`} className="bg-[#13131f]">
                {opt.label} ↓
              </option>
              <option value={`${opt.value}|asc`} className="bg-[#13131f]">
                {opt.label} ↑
              </option>
            </optgroup>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            aria-label="Clear filters"
            className="shrink-0 whitespace-nowrap rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Stats */}
      <div
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8"
        aria-label="Job statistics"
      >
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
          >
            <p className="text-sm text-white/50">{label}</p>
            <h2 className="text-4xl font-bold text-white mt-3">{value}</h2>
          </div>
        ))}
      </div>
      <JobAnalytics analytics={analytics} />

      {/* Job Board */}
      <section
        aria-label="Job board"
        className="
          rounded-3xl
          border
          border-white/10
          bg-white/[0.03]
          p-6
          md:p-8
          min-h-[400px]
        "
      >
        {loading ? (
          <div
            aria-label="Loading jobs"
            className="flex items-center justify-center py-20 text-white/50"
          >
            Loading jobs...
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-white/40 text-center">
              No jobs yet. Add your first job to get started.
            </p>
          </div>
        ) : visibleJobs.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-white/40 text-center">
              No jobs match your filters.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {paginatedJobs.map((job) => (
              <JobCard
                key={job._id}
                job={job}
                onEdit={openEdit}
                onSelect={setSelectedJob}
                transition={makeTransition(job._id)}
                onTransitioned={handleTransitioned}
              />
            ))}
          </ul>
        )}

        {!loading && visibleJobs.length > 0 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/50">Per page:</span>
              {[1, 3, 6, 9].map((n) => (
                <button
                  key={n}
                  onClick={() => setItemsPerPage(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition focus:outline-none flex items-center justify-center ${
                    itemsPerPage === n
                      ? 'bg-blue-600 text-white ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0e0e0e]'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 rounded-lg text-sm bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <span className="text-sm text-white/50">
                {safePage} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={safePage === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </section>

      {selectedJob && (
        <JobDetailPanel
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onEdit={openEdit}
          onDelete={handleDelete}
          onAddInterview={handleAddInterview}
          onUpdateInterview={handleUpdateInterview}
          onAddFollowUp={handleAddFollowUp}
          onUpdateFollowUp={handleUpdateFollowUp}
          onArchive={handleArchive}
          onRestore={handleRestore}
          transition={makeTransition(selectedJob._id)}
          onTransitioned={handleTransitioned}
        />
      )}

      {modalOpen && (
        <JobFormModal
          job={editingJob}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
