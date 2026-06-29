export const SORT_OPTIONS = [
  { value: 'lastActivityAt', label: 'Last activity' },
  { value: 'createdAt', label: 'Date added' },
  { value: 'company', label: 'Company' },
  { value: 'title', label: 'Title' },
];

function compareValues(a, b, sortBy) {
  if (sortBy === 'lastActivityAt' || sortBy === 'createdAt') {
    const da = a[sortBy] ? new Date(a[sortBy]).getTime() : 0;
    const db = b[sortBy] ? new Date(b[sortBy]).getTime() : 0;
    return da - db;
  }

  const va = (a[sortBy] ?? '').toString().toLowerCase();
  const vb = (b[sortBy] ?? '').toString().toLowerCase();
  return va.localeCompare(vb);
}

export function sortJobs(jobs, sortBy, direction = 'desc') {
  if (!sortBy) return jobs;

  const sorted = [...jobs].sort((a, b) => compareValues(a, b, sortBy));

  return direction === 'asc' ? sorted : sorted.reverse();
}


