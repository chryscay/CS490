import { describe, expect, it } from 'vitest';

import {
  matchesStage,
  matchesLocation,
  matchesDeadlineState,
  matchesSearch,
  applyFilters,
} from './jobFilters';

const baseJob = {
  _id: 'abc',
  title: 'Engineer',
  company: 'Acme',
  stage: 'Applied',
  deadline: null,
  location: null,
};

describe('matchesStage', () => {
  it('returns true when stage filter is empty', () => {
    expect(matchesStage(baseJob, '')).toBe(true);
  });

  it('returns true when stage matches', () => {
    expect(matchesStage({ ...baseJob, stage: 'Interview' }, 'Interview')).toBe(true);
  });

  it('returns false when stage does not match', () => {
    expect(matchesStage({ ...baseJob, stage: 'Applied' }, 'Offer')).toBe(false);
  });
});

describe('matchesLocation', () => {
  it('returns true when location filter is empty', () => {
    expect(matchesLocation(baseJob, '')).toBe(true);
  });

  it('returns true when job location contains the filter (case-insensitive)', () => {
    expect(matchesLocation({ ...baseJob, location: 'New York, NY' }, 'new york')).toBe(true);
  });

  it('returns false when job location does not match filter', () => {
    expect(matchesLocation({ ...baseJob, location: 'Chicago, IL' }, 'boston')).toBe(false);
  });

  it('returns false when job has no location and filter is set', () => {
    expect(matchesLocation({ ...baseJob, location: null }, 'remote')).toBe(false);
  });

  it('returns true when location filter is only whitespace', () => {
    expect(matchesLocation(baseJob, '   ')).toBe(true);
  });
});

describe('matchesSearch', () => {
  it('returns true when search is empty', () => {
    expect(matchesSearch(baseJob, '')).toBe(true);
  });

  it('matches on title (case-insensitive)', () => {
    expect(matchesSearch({ ...baseJob, title: 'Backend Engineer' }, 'backend')).toBe(true);
  });

  it('matches on company', () => {
    expect(matchesSearch({ ...baseJob, company: 'Acme Corp' }, 'acme')).toBe(true);
  });

  it('matches on keyword in the job posting body', () => {
    expect(matchesSearch({ ...baseJob, jobPostingBody: 'Must know Kubernetes' }, 'kubernetes')).toBe(true);
  });

  it('returns false when nothing matches', () => {
    expect(matchesSearch({ ...baseJob, title: 'Engineer', company: 'Acme', jobPostingBody: 'x' }, 'zzz')).toBe(false);
  });
});

describe('matchesDeadlineState', () => {
  const withDeadline = { ...baseJob, deadline: '2030-12-01T00:00:00.000Z' };
  const withoutDeadline = { ...baseJob, deadline: null };
  const overdue = { ...baseJob, deadline: '2020-01-01T00:00:00.000Z' };

  it('returns true when deadlineState is "all"', () => {
    expect(matchesDeadlineState(withDeadline, 'all')).toBe(true);
    expect(matchesDeadlineState(withoutDeadline, 'all')).toBe(true);
  });

  it('returns true when deadlineState is empty', () => {
    expect(matchesDeadlineState(withDeadline, '')).toBe(true);
  });

  it('"has-deadline" returns true only for jobs with a deadline', () => {
    expect(matchesDeadlineState(withDeadline, 'has-deadline')).toBe(true);
    expect(matchesDeadlineState(withoutDeadline, 'has-deadline')).toBe(false);
  });

  it('"no-deadline" returns true only for jobs without a deadline', () => {
    expect(matchesDeadlineState(withoutDeadline, 'no-deadline')).toBe(true);
    expect(matchesDeadlineState(withDeadline, 'no-deadline')).toBe(false);
  });

  it('"overdue" returns true for past deadlines', () => {
    expect(matchesDeadlineState(overdue, 'overdue')).toBe(true);
  });

  it('"overdue" returns false for future deadlines', () => {
    expect(matchesDeadlineState(withDeadline, 'overdue')).toBe(false);
  });

  it('"overdue" returns false for jobs with no deadline', () => {
    expect(matchesDeadlineState(withoutDeadline, 'overdue')).toBe(false);
  });
});

describe('applyFilters', () => {
  const jobs = [
    { _id: '1', stage: 'Applied', deadline: '2030-12-01T00:00:00.000Z', location: 'New York' },
    { _id: '2', stage: 'Interview', deadline: null, location: 'Chicago' },
    { _id: '3', stage: 'Applied', deadline: '2020-01-01T00:00:00.000Z', location: 'Remote' },
  ];

  it('returns all jobs when no filters are active', () => {
    expect(applyFilters(jobs, { stage: '', location: '', deadlineState: 'all' })).toHaveLength(3);
  });

  it('filters by stage', () => {
    const result = applyFilters(jobs, { stage: 'Interview', location: '', deadlineState: 'all' });
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('2');
  });

  it('filters by deadline state', () => {
    const result = applyFilters(jobs, { stage: '', location: '', deadlineState: 'has-deadline' });
    expect(result).toHaveLength(2);
  });

  it('filters by location', () => {
    const result = applyFilters(jobs, { stage: '', location: 'remote', deadlineState: 'all' });
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('3');
  });

  it('combines multiple filters', () => {
    const result = applyFilters(jobs, { stage: 'Applied', location: '', deadlineState: 'overdue' });
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('3');
  });

  it('returns empty array when nothing matches', () => {
    expect(
      applyFilters(jobs, { stage: 'Offer', location: '', deadlineState: 'all' })
    ).toHaveLength(0);
  });

  it('hides Archived jobs by default (showArchived not set)', () => {
    const withArchived = [...jobs, { _id: '4', stage: 'Archived', deadline: null, location: 'Remote' }];
    const result = applyFilters(withArchived, { stage: '', location: '', deadlineState: 'all' });
    expect(result.every((j) => j.stage !== 'Archived')).toBe(true);
    expect(result).toHaveLength(3);
  });

  it('shows Archived jobs when showArchived is true', () => {
    const withArchived = [...jobs, { _id: '4', stage: 'Archived', deadline: null, location: 'Remote' }];
    const result = applyFilters(withArchived, { stage: '', location: '', deadlineState: 'all', showArchived: true });
    expect(result).toHaveLength(4);
  });

  it('shows Archived jobs when filtering specifically by Archived stage', () => {
    const withArchived = [...jobs, { _id: '4', stage: 'Archived', deadline: null, location: 'Remote' }];
    const result = applyFilters(withArchived, { stage: 'Archived', location: '', deadlineState: 'all' });
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('4');
  });
});
