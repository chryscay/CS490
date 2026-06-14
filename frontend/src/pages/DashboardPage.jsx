import './DashboardPage.css';

const STATS = [
  { label: 'Total Jobs', value: 0 },
  { label: 'Applications', value: 0 },
  { label: 'Interviews', value: 0 },
  { label: 'Hired', value: 0 },
];

export default function DashboardPage() {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <button className="btn-primary">+ Add Job</button>
      </div>

      <div className="stats-row" aria-label="Job statistics">
        {STATS.map(({ label, value }) => (
          <div key={label} className="stat-card">
            <span className="stat-value">{value}</span>
            <span className="stat-label">{label}</span>
          </div>
        ))}
      </div>

      <section className="job-board" aria-label="Job board">
        <div className="empty-state">
          <p>No jobs yet. Add your first job to get started.</p>
        </div>
      </section>
    </div>
  );
}
