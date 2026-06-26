import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/useAuth';
import JobCard from '../features/jobs/JobCard';
import JobFormModal from '../features/jobs/JobFormModal';
import JobDetailPanel from '../features/jobs/JobDetailPanel';
import { transitionStage, deleteJob, addInterview, updateInterview } from '../features/jobs/jobsApi';
import { STAGES } from '../features/jobs/stageStyles';
import { applyFilters } from '../features/jobs/jobFilters';

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
    const { job } = await updateInterview(selectedJob._id, interviewId, entry, token);
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

  const visibleJobs = applyFilters(jobs, {
    stage: filterStage,
    location: filterLocation,
    deadlineState: filterDeadlineState,
    search: searchTerm,
  });

  const stats = [
    { label: 'Total Jobs', value: jobs.length },
    { label: 'Applications', value: jobs.filter((j) => j.stage === 'Applied').length },
    { label: 'Interviews', value: jobs.filter((j) => j.stage === 'Interview').length },
    { label: 'Hired', value: jobs.filter((j) => j.stage === 'Hired').length },
  ];

  const selectClass = `
    rounded-xl
    bg-white/5
    border
    border-white/10
    px-4
    py-2.5
    text-sm
    text-white
    focus:outline-none
    focus:ring-2
    focus:ring-blue-500
  `;

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
          className="
            rounded-xl
            bg-white/5
            border
            border-white/10
            px-4
            py-2.5
            text-sm
            text-white
            placeholder-white/40
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
          "
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
          className="
            rounded-xl
            bg-white/5
            border
            border-white/10
            px-4
            py-2.5
            text-sm
            text-white
            placeholder-white/40
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
          "
        />

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            aria-label="Clear filters"
            className="
              rounded-xl
              border
              border-white/10
              px-4
              py-2.5
              text-sm
              text-white/60
              hover:text-white
              hover:bg-white/5
              transition
            "
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Stats */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8"
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
            {visibleJobs.map((job) => (
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
      </section>

      {selectedJob && (
        <JobDetailPanel
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onEdit={openEdit}
          onDelete={handleDelete}
          onAddInterview={handleAddInterview}
          onUpdateInterview={handleUpdateInterview}
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
