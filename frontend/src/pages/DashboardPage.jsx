import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/useAuth';
import JobCard from '../features/jobs/JobCard';
import './DashboardPage.css';

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    currentUser.getIdToken().then((token) => {
      fetch(`${import.meta.env.VITE_API_URL}/api/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setJobs(data.jobs ?? []))
        .catch(() => setJobs([]))
        .finally(() => setLoading(false));
    });
  }, [currentUser]);

  const stats = [
    { label: 'Total Jobs', value: jobs.length },
    { label: 'Applications', value: jobs.filter((j) => j.stage === 'Applied').length },
    { label: 'Interviews', value: jobs.filter((j) => j.stage === 'Interview').length },
    { label: 'Hired', value: jobs.filter((j) => j.stage === 'Hired').length },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <button className="btn-primary">+ Add Job</button>
      </div>

      <div className="stats-row" aria-label="Job statistics">
        {stats.map(({ label, value }) => (
          <div key={label} className="stat-card">
            <span className="stat-value">{value}</span>
            <span className="stat-label">{label}</span>
          </div>
        ))}
      </div>

      <section className="job-board" aria-label="Job board">
        {loading ? (
          <div className="loading-state" aria-label="Loading jobs">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <p>No jobs yet. Add your first job to get started.</p>
          </div>
        ) : (
          <ul className="job-list">
            {jobs.map((job) => (
              <JobCard key={job._id} job={job} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
