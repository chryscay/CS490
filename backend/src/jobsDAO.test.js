import { vi, describe, it, expect, beforeEach } from 'vitest';
import JobsDAO from './dao/jobsDAO.js';

const mockFindOneAndUpdate = vi.fn();

const mockConn = {
  db: () => ({
    collection: () => ({
      findOneAndUpdate: mockFindOneAndUpdate,
    }),
  }),
};

describe('JobsDAO.appendStageTransition', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await JobsDAO.injectDB(mockConn);
  });

  it('updates the stage and appends a transition history entry', async () => {
    const entry = {
      id: 'transition-1',
      fromStage: 'Interested',
      toStage: 'Applied',
      changedAt: '2026-06-24T18:00:00.000Z',
      changedBy: 'user-a',
      isOverride: false,
      note: '',
    };

    mockFindOneAndUpdate.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      firebaseUid: 'user-a',
      stage: 'Applied',
      stageHistory: [entry],
    });

    const result = await JobsDAO.appendStageTransition(
      '507f1f77bcf86cd799439011',
      'user-a',
      entry
    );

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: expect.any(Object),
        firebaseUid: 'user-a',
      },
      {
        $set: expect.objectContaining({
          stage: 'Applied',
          lastActivityAt: expect.any(Date),
        }),
        $push: {
          stageHistory: entry,
        },
      },
      {
        returnDocument: 'after',
      }
    );

    expect(result).toEqual({
      _id: '507f1f77bcf86cd799439011',
      firebaseUid: 'user-a',
      stage: 'Applied',
      stageHistory: [entry],
    });
  });

  it('returns null when the job id is invalid', async () => {
    const result = await JobsDAO.appendStageTransition(
      'not-a-valid-objectid',
      'user-a',
      {}
    );

    expect(result).toBeNull();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns null when no owned job is found', async () => {
    const entry = {
      id: 'transition-1',
      fromStage: 'Interested',
      toStage: 'Applied',
      changedAt: '2026-06-24T18:00:00.000Z',
      changedBy: 'user-a',
      isOverride: false,
      note: '',
    };

    mockFindOneAndUpdate.mockResolvedValue(null);

    const result = await JobsDAO.appendStageTransition(
      '507f1f77bcf86cd799439011',
      'user-a',
      entry
    );

    expect(result).toBeNull();

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: expect.any(Object),
        firebaseUid: 'user-a',
      },
      {
        $set: expect.objectContaining({
          stage: 'Applied',
          lastActivityAt: expect.any(Date),
        }),
        $push: {
          stageHistory: entry,
        },
      },
      {
        returnDocument: 'after',
      }
    );
  });
});
