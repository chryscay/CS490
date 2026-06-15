import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/useAuth';
import JobCard from '../features/jobs/JobCard';
import JobFormModal from '../features/jobs/JobFormModal';

export default function DashboardPage() {
  const { currentUser } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

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
    setEditingJob(job);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setModalOpen(false);
    setEditingJob(null);
    setLoading(true);
    loadJobs();
  };

  const stats = [
    {
      label: 'Total Jobs',
      value: jobs.length,
    },
    {
      label: 'Applications',
      value: jobs.filter((j) => j.stage === 'Applied').length,
    },
    {
      label: 'Interviews',
      value: jobs.filter((j) => j.stage === 'Interview').length,
    },
    {
      label: 'Hired',
      value: jobs.filter((j) => j.stage === 'Hired').length,
    },
  ];

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
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

      <div
        className="
          grid
          grid-cols-1
          sm:grid-cols-2
          xl:grid-cols-4
          gap-4
          mb-8
        "
        aria-label="Job statistics"
      >
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className="
              rounded-2xl
              border
              border-white/10
              bg-white/[0.03]
              p-6
            "
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
        ) : (
          <ul className="space-y-4">
            {jobs.map((job) => (
              <JobCard key={job._id} job={job} onEdit={openEdit} />
            ))}
          </ul>
        )}
      </section>

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
