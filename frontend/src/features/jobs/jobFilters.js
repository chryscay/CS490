export function matchesStage(job, stage) {
  if (!stage) return true;
  return job.stage === stage;
}

export function matchesLocation(job, location) {
  if (!location) return true;
  const q = location.trim().toLowerCase();
  if (!q) return true;
  return (job.location ?? '').toLowerCase().includes(q);
}

export function matchesDeadlineState(job, deadlineState) {
  if (!deadlineState || deadlineState === 'all') return true;
  if (deadlineState === 'has-deadline') return Boolean(job.deadline);
  if (deadlineState === 'no-deadline') return !job.deadline;
  if (deadlineState === 'overdue') {
    if (!job.deadline) return false;
    return new Date(job.deadline) < new Date();
  }
  return true;
}

export function applyFilters(jobs, { stage, location, deadlineState }) {
  return jobs.filter(
    (job) =>
      matchesStage(job, stage) &&
      matchesLocation(job, location) &&
      matchesDeadlineState(job, deadlineState)
  );
}
