import { describe, it, expect } from 'vitest';
import {
  isRequired, isTenDigitPhone, endNotBeforeStart, hasNoDuplicates,
} from './validators.js';

describe('profile validators', () => {
  it('isRequired treats whitespace as empty', () => {
    expect(isRequired('Ada')).toBe(true);
    expect(isRequired('   ')).toBe(false);
    expect(isRequired('')).toBe(false);
  });

  it('isTenDigitPhone allows empty and exactly 10 digits only', () => {
    expect(isTenDigitPhone('')).toBe(true);
    expect(isTenDigitPhone('5550100123')).toBe(true);
    expect(isTenDigitPhone('555010012')).toBe(false);
    expect(isTenDigitPhone('55501001234')).toBe(false);
  });

  it('endNotBeforeStart enforces S2-BR-015 date ordering', () => {
    expect(endNotBeforeStart('2024-01-01', '2024-06-01')).toBe(true);
    expect(endNotBeforeStart('2024-06-01', '2024-01-01')).toBe(false);
    expect(endNotBeforeStart('2024-01-01', '')).toBe(true); // open-ended is allowed
  });

  it('hasNoDuplicates enforces S2-BR-016 (case/space-insensitive)', () => {
    expect(hasNoDuplicates(['React', 'Node'])).toBe(true);
    expect(hasNoDuplicates(['React', ' react '])).toBe(false);
    expect(hasNoDuplicates([])).toBe(true);
  });
});