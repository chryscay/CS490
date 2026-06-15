import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/useAuth';

export default function DashboardPage() {
  const { currentUser } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadJobs() {
      try {
        const token = await currentUser?.getIdToken();

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/jobs`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        setJobs(data.jobs || []);
      } catch (error) {
        console.error('Failed to load jobs:', error);
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, [currentUser]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-semibold text-white">Dashboard</h1>

          <p className="text-white/50 mt-2">Track your job applications.</p>
        </div>

        <button className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition">
          Add Job
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Jobs" value={jobs.length} />
        <StatCard
          title="Applications"
          value={jobs.filter((j) => j.stage === 'Applied').length}
        />
        <StatCard
          title="Interviews"
          value={jobs.filter((j) => j.stage === 'Interview').length}
        />
        <StatCard
          title="Hired"
          value={jobs.filter((j) => j.stage === 'Hired').length}
        />
      </div>

      {/* Job Board */}
      <section
        role="region"
        aria-label="Job Board"
        className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 min-h-[500px]"
      >
        {loading ? (
          <div
            aria-label="Loading jobs"
            className="flex justify-center items-center h-full text-white/50"
          >
            Loading jobs...
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex justify-center items-center h-full text-white/40">
            No jobs yet. Add your first job to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job._id}
                className="rounded-2xl border border-white/10 bg-black/20 p-5"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {job.title}
                    </h3>

                    <p className="text-white/60">{job.company}</p>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 text-sm">
                    {job.stage}
                  </span>
                </div>

                <p className="mt-3 text-sm text-white/40">
                  Last activity:{' '}
                  {job.lastActivityAt
                    ? new Date(job.lastActivityAt).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <p className="text-sm text-white/50">{title}</p>

      <h2 className="text-4xl font-bold mt-3 text-white">{value}</h2>
    </div>
  );
}
