import { describe, expect, it } from 'vitest';
import { getStageStyles, STAGES } from '../features/jobs/stageStyles';

describe('getStageStyles', () => {
  it('gives each canonical stage a distinct style', () => {
    const styles = STAGES.map((stage) => getStageStyles(stage));
    expect(new Set(styles).size).toBe(STAGES.length);
  });

  it('falls back to the Interested style for an unknown stage', () => {
    expect(getStageStyles('Hired')).toBe(getStageStyles('Interested'));
    expect(getStageStyles(undefined)).toBe(getStageStyles('Interested'));
  });
});