import { describe, expect, it } from 'vitest';
import { sortJobs } from './jobSort';

const jobs = [
  { _id: '1', title: 'Backend Engineer', company: 'Beta', createdAt: '2026-01-01T00:00:00.000Z', lastActivityAt: '2026-03-01T00:00:00.000Z' },
  { _id: '2', title: 'Analyst', company: 'Alpha', createdAt: '2026-02-01T00:00:00.000Z', lastActivityAt: '2026-01-01T00:00:00.000Z' },
  { _id: '3', title: 'Cloud Architect', company: 'Gamma', createdAt: '2026-03-01T00:00:00.000Z', lastActivityAt: '2026-02-01T00:00:00.000Z' },
];

describe('sortJobs', () => {
  it('returns the list unchanged when no sort key is given', () => {
    expect(sortJobs(jobs, '').map((j) => j._id)).toEqual(['1', '2', '3']);
  });

  it('sorts by title ascending', () => {
    expect(sortJobs(jobs, 'title', 'asc').map((j) => j._id)).toEqual(['2', '1', '3']);
  });

  it('sorts by company ascending', () => {
    expect(sortJobs(jobs, 'company', 'asc').map((j) => j._id)).toEqual(['2', '1', '3']);
  });

  it('sorts by date added descending (newest first)', () => {
    expect(sortJobs(jobs, 'createdAt', 'desc').map((j) => j._id)).toEqual(['3', '2', '1']);
  });

  it('sorts by last activity descending', () => {
    expect(sortJobs(jobs, 'lastActivityAt', 'desc').map((j) => j._id)).toEqual(['1', '3', '2']);
  });

  it('does not mutate the original array', () => {
    const original = [...jobs];
    sortJobs(jobs, 'title', 'asc');
    expect(jobs).toEqual(original);
  });
});


