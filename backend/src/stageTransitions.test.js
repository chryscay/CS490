// SCRUM-63 / S2-026: unit tests for the canonical stage-transition domain
// logic (stageTransitions.js). These cover the pure functions directly —
// the HTTP-level transition behavior is covered separately in jobs.test.js.
// Rules under test: S2-BR-004 (canonical stages), S2-BR-005 (forward matrix),
// S2-BR-006 (Archived/Rejected terminal), S2-013 (outcome stages).
import { describe, it, expect } from 'vitest';
import {
  STAGES,
  OUTCOME_STAGES,
  isValidStage,
  isForwardTransition,
  isOutcomeStage,
} from './lib/stageTransitions.js';

describe('STAGES (S2-BR-004 canonical set)', () => {
  it('contains exactly the six canonical stages in order', () => {
    expect(STAGES).toEqual([
      'Interested',
      'Applied',
      'Interview',
      'Offer',
      'Rejected',
      'Archived',
    ]);
  });
});

describe('isValidStage (S2-BR-004)', () => {
  it('returns true for every canonical stage', () => {
    STAGES.forEach((stage) => {
      expect(isValidStage(stage)).toBe(true);
    });
  });

  it('returns false for a non-canonical stage', () => {
    expect(isValidStage('Hired')).toBe(false);
  });

  it('returns false for empty string, null, and undefined', () => {
    expect(isValidStage('')).toBe(false);
    expect(isValidStage(null)).toBe(false);
    expect(isValidStage(undefined)).toBe(false);
  });

  it('is case-sensitive (lowercase is not valid)', () => {
    expect(isValidStage('interested')).toBe(false);
  });
});

describe('isForwardTransition (S2-BR-005 forward matrix)', () => {
  // Every allowed forward edge from the canonical matrix.
  it.each([
    ['Interested', 'Applied'],
    ['Interested', 'Rejected'],
    ['Applied', 'Interview'],
    ['Applied', 'Rejected'],
    ['Interview', 'Offer'],
    ['Interview', 'Rejected'],
    ['Offer', 'Archived'],
    ['Offer', 'Rejected'],
  ])('allows the forward transition %s -> %s', (from, to) => {
    expect(isForwardTransition(from, to)).toBe(true);
  });

  // Representative non-forward edges (backward / skipping / into terminal).
  it.each([
    ['Applied', 'Interested'], // backward
    ['Interview', 'Applied'], // backward
    ['Interested', 'Interview'], // skips Applied
    ['Interested', 'Offer'], // skips multiple
    ['Applied', 'Offer'], // skips Interview
  ])('rejects the non-forward transition %s -> %s', (from, to) => {
    expect(isForwardTransition(from, to)).toBe(false);
  });

  it('treats Rejected as terminal — no forward moves out (S2-BR-006)', () => {
    STAGES.forEach((to) => {
      expect(isForwardTransition('Rejected', to)).toBe(false);
    });
  });

  it('treats Archived as terminal — no forward moves out (S2-BR-006)', () => {
    STAGES.forEach((to) => {
      expect(isForwardTransition('Archived', to)).toBe(false);
    });
  });

  it('rejects a self-transition for every stage', () => {
    STAGES.forEach((stage) => {
      expect(isForwardTransition(stage, stage)).toBe(false);
    });
  });

  it('returns false when fromStage is unknown (no matrix entry)', () => {
    expect(isForwardTransition('Hired', 'Applied')).toBe(false);
    expect(isForwardTransition(undefined, 'Applied')).toBe(false);
  });
});

describe('isOutcomeStage (S2-013 resolution stages)', () => {
  it('exposes Offer, Rejected, and Archived as the outcome set', () => {
    expect(OUTCOME_STAGES).toEqual(['Offer', 'Rejected', 'Archived']);
  });

  it('returns true for each outcome stage', () => {
    expect(isOutcomeStage('Offer')).toBe(true);
    expect(isOutcomeStage('Rejected')).toBe(true);
    expect(isOutcomeStage('Archived')).toBe(true);
  });

  it('returns false for non-outcome (in-progress) stages', () => {
    expect(isOutcomeStage('Interested')).toBe(false);
    expect(isOutcomeStage('Applied')).toBe(false);
    expect(isOutcomeStage('Interview')).toBe(false);
  });

  it('returns false for unknown / empty input', () => {
    expect(isOutcomeStage('Hired')).toBe(false);
    expect(isOutcomeStage('')).toBe(false);
    expect(isOutcomeStage(undefined)).toBe(false);
  });
});