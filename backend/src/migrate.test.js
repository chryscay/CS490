import { vi, describe, it, expect, beforeEach } from 'vitest';
import { runStatus, runUp, runDown, runVerify } from './lib/migrate/runner.js';

// --- ledger mock (the `migrations` collection) -----------------------------
const mockInsertOne = vi.fn();
const mockDeleteOne = vi.fn();
const mockToArray = vi.fn();
const mockFind = vi.fn(() => ({ toArray: mockToArray }));

const mockDb = {
  collection: vi.fn(() => ({
    find: mockFind,
    insertOne: mockInsertOne,
    deleteOne: mockDeleteOne,
  })),
};

// A fake migration source: { name: { up, down } }. list() is sorted by name.
const makeSource = (migrations) => ({
  list: vi.fn(async () => Object.keys(migrations).sort()),
  load: vi.fn(async (name) => {
    if (!migrations[name]) throw new Error(`Migration file ${name}.js not found.`);
    return migrations[name];
  }),
});

// Ledger currently holds these applied names (find().toArray()).
const ledgerHas = (...names) =>
  mockToArray.mockResolvedValue(names.map((name) => ({ name })));

beforeEach(() => {
  vi.clearAllMocks();
  mockToArray.mockResolvedValue([]); // empty ledger by default
});

describe('runUp', () => {
  it('applies all pending migrations in order and records each in the ledger', async () => {
    ledgerHas(); // nothing applied yet
    const m1 = { up: vi.fn(), down: vi.fn() };
    const m2 = { up: vi.fn(), down: vi.fn() };
    const source = makeSource({
      '20260101000000-first': m1,
      '20260102000000-second': m2,
    });

    const result = await runUp(mockDb, source);

    expect(m1.up).toHaveBeenCalledWith(mockDb);
    expect(m2.up).toHaveBeenCalledWith(mockDb);
    expect(mockInsertOne).toHaveBeenCalledTimes(2);
    expect(mockInsertOne).toHaveBeenNthCalledWith(1, {
      name: '20260101000000-first',
      appliedAt: expect.any(Date),
      direction: 'up',
    });
    expect(result.appliedNow).toEqual([
      '20260101000000-first',
      '20260102000000-second',
    ]);
  });

  it('skips migrations already recorded in the ledger (idempotent re-run)', async () => {
    ledgerHas('20260101000000-first'); // first already applied
    const m1 = { up: vi.fn(), down: vi.fn() };
    const m2 = { up: vi.fn(), down: vi.fn() };
    const source = makeSource({
      '20260101000000-first': m1,
      '20260102000000-second': m2,
    });

    const result = await runUp(mockDb, source);

    expect(m1.up).not.toHaveBeenCalled();
    expect(m2.up).toHaveBeenCalledTimes(1);
    expect(mockInsertOne).toHaveBeenCalledTimes(1);
    expect(mockInsertOne).toHaveBeenCalledWith({
      name: '20260102000000-second',
      appliedAt: expect.any(Date),
      direction: 'up',
    });
    expect(result.appliedNow).toEqual(['20260102000000-second']);
  });

  it('does NOT record a migration whose up() throws, so it stays pending', async () => {
    ledgerHas();
    const boom = { up: vi.fn().mockRejectedValue(new Error('bad migration')), down: vi.fn() };
    const source = makeSource({ '20260101000000-boom': boom });

    await expect(runUp(mockDb, source)).rejects.toThrow('bad migration');
    expect(mockInsertOne).not.toHaveBeenCalled(); // ledger untouched -> re-runnable
  });

  it('applies a previously-failed migration on a later successful run', async () => {
    // First run: up throws, nothing recorded.
    ledgerHas();
    const failing = { up: vi.fn().mockRejectedValue(new Error('bad migration')), down: vi.fn() };
    await expect(
      runUp(mockDb, makeSource({ '20260101000000-fix': failing }))
    ).rejects.toThrow();
    expect(mockInsertOne).not.toHaveBeenCalled();

    // Second run: same name, up now succeeds -> it applies and records once.
    vi.clearAllMocks();
    ledgerHas(); // still not in ledger
    const fixed = { up: vi.fn(), down: vi.fn() };
    const result = await runUp(mockDb, makeSource({ '20260101000000-fix': fixed }));

    expect(fixed.up).toHaveBeenCalledTimes(1);
    expect(mockInsertOne).toHaveBeenCalledTimes(1);
    expect(result.appliedNow).toEqual(['20260101000000-fix']);
  });
});

describe('runDown', () => {
  it('rolls back the most recently applied migration and removes its ledger record', async () => {
    ledgerHas('20260101000000-first', '20260102000000-second');
    const m1 = { up: vi.fn(), down: vi.fn() };
    const m2 = { up: vi.fn(), down: vi.fn() };
    const source = makeSource({
      '20260101000000-first': m1,
      '20260102000000-second': m2,
    });

    const result = await runDown(mockDb, source);

    expect(m2.down).toHaveBeenCalledWith(mockDb);
    expect(m1.down).not.toHaveBeenCalled();
    expect(mockDeleteOne).toHaveBeenCalledWith({ name: '20260102000000-second' });
    expect(result.rolledBack).toBe('20260102000000-second');
  });

  it('does nothing when the ledger is empty', async () => {
    ledgerHas();
    const source = makeSource({});
    const result = await runDown(mockDb, source);

    expect(mockDeleteOne).not.toHaveBeenCalled();
    expect(result.rolledBack).toBeNull();
  });

  it('keeps the ledger record if down() throws (no false "rolled back")', async () => {
    ledgerHas('20260101000000-first');
    const failing = { up: vi.fn(), down: vi.fn().mockRejectedValue(new Error('down failed')) };
    const source = makeSource({ '20260101000000-first': failing });

    await expect(runDown(mockDb, source)).rejects.toThrow('down failed');
    expect(mockDeleteOne).not.toHaveBeenCalled(); // record retained -> state stays truthful
  });
});

describe('runStatus', () => {
  it('reads applied state from the persisted ledger, not memory', async () => {
    ledgerHas('20260101000000-first');
    const source = makeSource({
      '20260101000000-first': { up: vi.fn(), down: vi.fn() },
      '20260102000000-second': { up: vi.fn(), down: vi.fn() },
    });

    const result = await runStatus(mockDb, source);

    expect(mockFind).toHaveBeenCalled(); // state came from the ledger collection
    expect(result.applied).toEqual(['20260101000000-first']);
    expect(result.pending).toEqual(['20260102000000-second']);
  });
});

describe('runVerify', () => {
    it('loads every migration file and reports them verified', async () => {
      const source = makeSource({
        '20260101000000-first': { up: vi.fn(), down: vi.fn() },
        '20260102000000-second': { up: vi.fn(), down: vi.fn() },
      });
  
      const result = await runVerify(source);
  
      expect(source.load).toHaveBeenCalledTimes(2);
      expect(result.verified).toEqual([
        '20260101000000-first',
        '20260102000000-second',
      ]);
    });
  
    it('reports nothing when there are no migration files', async () => {
      const result = await runVerify(makeSource({}));
      expect(result.verified).toEqual([]);
    });
  
    it('throws if any migration file fails to load or is missing up/down', async () => {
      const source = {
        list: vi.fn(async () => ['20260101000000-broken']),
        load: vi.fn(async () => {
          throw new Error('must export async up(db) and down(db)');
        }),
      };
      await expect(runVerify(source)).rejects.toThrow('must export');
    });
  });