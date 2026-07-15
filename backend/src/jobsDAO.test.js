import { vi, describe, it, expect, beforeEach } from 'vitest';
import JobsDAO from './dao/jobsDAO.js';

const mockInsertOne = vi.fn();
const mockFind = vi.fn();
const mockSort = vi.fn();
const mockToArray = vi.fn();
const mockFindOne = vi.fn();
const mockFindOneAndUpdate = vi.fn();
const mockFindOneAndDelete = vi.fn();
const mockAggregate = vi.fn();
const mockUpdateMany = vi.fn();

mockFind.mockImplementation(() => ({
  sort: mockSort,
}));

mockSort.mockImplementation(() => ({
  toArray: mockToArray,
}));

const mockConn = {
  db: () => ({
    collection: () => ({
      insertOne: mockInsertOne,
      find: mockFind,
      findOne: mockFindOne,
      findOneAndUpdate: mockFindOneAndUpdate,
      findOneAndDelete: mockFindOneAndDelete,
      aggregate: mockAggregate,
      updateMany: mockUpdateMany,
    }),
  }),
};

describe('JobsDAO.addJob', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await JobsDAO.injectDB(mockConn);
  });

  it('persists firebaseUid ownership on new jobs', async () => {
    mockInsertOne.mockResolvedValue({ insertedId: 'job-1' });

    await JobsDAO.addJob({
      firebaseUid: 'user-a',
      company: 'Acme',
      title: 'Backend Engineer',
      jobPostingBody: 'Build services',
      stage: 'Interested',
      deadline: '',
      recruiterName: '',
      contactNotes: '',
    });

    expect(mockInsertOne).toHaveBeenCalledWith(
      expect.objectContaining({ firebaseUid: 'user-a' })
    );
  });
});

describe('JobsDAO.findByOwner', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await JobsDAO.injectDB(mockConn);
  });

  it('filters by firebaseUid when listing jobs', async () => {
    mockToArray.mockResolvedValue([{ _id: 'job-1', firebaseUid: 'user-a' }]);

    const result = await JobsDAO.findByOwner('user-a');

    expect(mockFind).toHaveBeenCalledWith({ firebaseUid: 'user-a' });
    expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(result).toHaveLength(1);
  });
});

describe('JobsDAO.findByIdForOwner', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await JobsDAO.injectDB(mockConn);
  });

  it('includes firebaseUid in the ownership lookup filter', async () => {
    mockFindOne.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      firebaseUid: 'user-a',
    });

    await JobsDAO.findByIdForOwner('507f1f77bcf86cd799439011', 'user-a');

    expect(mockFindOne).toHaveBeenCalledWith({
      _id: expect.any(Object),
      firebaseUid: 'user-a',
    });
  });

  it('returns null for an invalid job id', async () => {
    const result = await JobsDAO.findByIdForOwner('bad-id', 'user-a');

    expect(result).toBeNull();
    expect(mockFindOne).not.toHaveBeenCalled();
  });
});

describe('JobsDAO.updateJob', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await JobsDAO.injectDB(mockConn);
  });

  it('includes firebaseUid in the update filter', async () => {
    mockFindOneAndUpdate.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      firebaseUid: 'user-a',
      company: 'Acme',
    });

    await JobsDAO.updateJob('507f1f77bcf86cd799439011', 'user-a', {
      company: 'Acme',
    });

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: expect.any(Object),
        firebaseUid: 'user-a',
      },
      {
        $set: {
          company: 'Acme',
          lastActivityAt: expect.any(Date),
        },
      },
      { returnDocument: 'after' }
    );
  });

  it('returns null for an invalid job id', async () => {
    const result = await JobsDAO.updateJob('bad-id', 'user-a', {
      company: 'Acme',
    });

    expect(result).toBeNull();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe('JobsDAO.deleteJob', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await JobsDAO.injectDB(mockConn);
  });

  it('includes firebaseUid in the delete filter', async () => {
    mockFindOneAndDelete.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      firebaseUid: 'user-a',
    });

    await JobsDAO.deleteJob('507f1f77bcf86cd799439011', 'user-a');

    expect(mockFindOneAndDelete).toHaveBeenCalledWith({
      _id: expect.any(Object),
      firebaseUid: 'user-a',
    });
  });

  it('returns null for an invalid job id', async () => {
    const result = await JobsDAO.deleteJob('bad-id', 'user-a');

    expect(result).toBeNull();
    expect(mockFindOneAndDelete).not.toHaveBeenCalled();
  });
});

describe('JobsDAO.addInterview', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await JobsDAO.injectDB(mockConn);
  });

  it('pushes the interview entry and sets lastActivityAt', async () => {
    const entry = {
      id: 'iv-1',
      roundType: 'Technical Screen',
      scheduledAt: '2026-08-01T14:00:00.000Z',
      notes: 'Algorithms focus.',
      createdAt: '2026-07-01T00:00:00.000Z',
    };

    mockFindOneAndUpdate.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      firebaseUid: 'user-a',
      interviews: [entry],
    });

    const result = await JobsDAO.addInterview(
      '507f1f77bcf86cd799439011',
      'user-a',
      entry
    );

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: expect.any(Object), firebaseUid: 'user-a' },
      {
        $push: { interviews: entry },
        $set: { lastActivityAt: expect.any(Date) },
      },
      { returnDocument: 'after' }
    );
    expect(result.interviews).toHaveLength(1);
  });

  it('returns null for an invalid job id', async () => {
    const result = await JobsDAO.addInterview('bad-id', 'user-a', {});
    expect(result).toBeNull();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe('JobsDAO.updateInterview', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await JobsDAO.injectDB(mockConn);
  });

  it('updates matching interview fields in place', async () => {
    const fields = {
      roundType: 'System Design',
      scheduledAt: '2026-08-05T10:00:00.000Z',
      notes: 'Design a URL shortener.',
    };

    mockFindOneAndUpdate.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      firebaseUid: 'user-a',
      interviews: [{ id: 'iv-1', ...fields }],
    });

    await JobsDAO.updateInterview(
      '507f1f77bcf86cd799439011',
      'user-a',
      'iv-1',
      fields
    );

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: expect.any(Object),
        firebaseUid: 'user-a',
        'interviews.id': 'iv-1',
      },
      {
        $set: {
          'interviews.$.roundType': fields.roundType,
          'interviews.$.scheduledAt': fields.scheduledAt,
          'interviews.$.notes': fields.notes,
          lastActivityAt: expect.any(Date),
        },
      },
      { returnDocument: 'after' }
    );
  });

  it('returns null for an invalid job id', async () => {
    const result = await JobsDAO.updateInterview(
      'bad-id',
      'user-a',
      'iv-1',
      {}
    );
    expect(result).toBeNull();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe('JobsDAO.addFollowUp', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await JobsDAO.injectDB(mockConn);
  });

  it('pushes the follow-up entry and sets lastActivityAt', async () => {
    const entry = {
      id: 'fu-1',
      title: 'Send thank you email',
      dueAt: '2026-08-03T09:00:00.000Z',
      completedAt: null,
      createdAt: '2026-07-01T00:00:00.000Z',
    };

    mockFindOneAndUpdate.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      firebaseUid: 'user-a',
      followUps: [entry],
    });

    const result = await JobsDAO.addFollowUp(
      '507f1f77bcf86cd799439011',
      'user-a',
      entry
    );

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: expect.any(Object), firebaseUid: 'user-a' },
      {
        $push: { followUps: entry },
        $set: { lastActivityAt: expect.any(Date) },
      },
      { returnDocument: 'after' }
    );
    expect(result.followUps).toHaveLength(1);
  });

  it('returns null for an invalid job id', async () => {
    const result = await JobsDAO.addFollowUp('bad-id', 'user-a', {});
    expect(result).toBeNull();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe('JobsDAO.updateFollowUp', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await JobsDAO.injectDB(mockConn);
  });

  it('updates matching follow-up fields in place', async () => {
    const fields = {
      title: 'Updated title',
      dueAt: '2026-08-10T10:00:00.000Z',
      completedAt: '2026-08-05T14:00:00.000Z',
    };

    mockFindOneAndUpdate.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      firebaseUid: 'user-a',
      followUps: [{ id: 'fu-1', ...fields }],
    });

    await JobsDAO.updateFollowUp(
      '507f1f77bcf86cd799439011',
      'user-a',
      'fu-1',
      fields
    );

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: expect.any(Object),
        firebaseUid: 'user-a',
        'followUps.id': 'fu-1',
      },
      {
        $set: {
          'followUps.$.title': fields.title,
          'followUps.$.dueAt': fields.dueAt,
          'followUps.$.completedAt': fields.completedAt,
          lastActivityAt: expect.any(Date),
        },
      },
      { returnDocument: 'after' }
    );
  });

  it('stores null completedAt when field is absent', async () => {
    const fields = { title: 'Check in', dueAt: '2026-08-10T10:00:00.000Z' };
    mockFindOneAndUpdate.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      firebaseUid: 'user-a',
      followUps: [{ id: 'fu-1', completedAt: null }],
    });

    await JobsDAO.updateFollowUp(
      '507f1f77bcf86cd799439011',
      'user-a',
      'fu-1',
      fields
    );

    const setArg = mockFindOneAndUpdate.mock.calls[0][1].$set;
    expect(setArg['followUps.$.completedAt']).toBeNull();
  });

  it('returns null for an invalid job id', async () => {
    const result = await JobsDAO.updateFollowUp('bad-id', 'user-a', 'fu-1', {});
    expect(result).toBeNull();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });
});

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

describe('JobsDAO.setLinkedDocument', () => {
  const JOB_ID = '507f1f77bcf86cd799439011';
  const DOC_ID = '507f1f77bcf86cd799439012';

  beforeEach(async () => {
    vi.clearAllMocks();
    await JobsDAO.injectDB(mockConn);
  });

  it('calls findOneAndUpdate with $set for the correct linkedDocuments field', async () => {
    mockFindOneAndUpdate.mockResolvedValue({
      _id: JOB_ID,
      firebaseUid: 'user-a',
      linkedDocuments: { resume: DOC_ID },
    });

    const result = await JobsDAO.setLinkedDocument(
      JOB_ID,
      'user-a',
      'resume',
      DOC_ID
    );

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: expect.any(Object), firebaseUid: 'user-a' },
      {
        $set: expect.objectContaining({
          'linkedDocuments.resume': expect.anything(),
        }),
      },
      { returnDocument: 'after' }
    );
    expect(result).not.toBeNull();
  });

  it('returns null for an invalid jobId without calling the DB', async () => {
    const result = await JobsDAO.setLinkedDocument(
      'not-valid',
      'user-a',
      'resume',
      DOC_ID
    );
    expect(result).toBeNull();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe('JobsDAO.clearLinkedDocument', () => {
  const JOB_ID = '507f1f77bcf86cd799439011';

  beforeEach(async () => {
    vi.clearAllMocks();
    await JobsDAO.injectDB(mockConn);
  });

  it('sets the linked document field to null', async () => {
    mockFindOneAndUpdate.mockResolvedValue({
      _id: JOB_ID,
      firebaseUid: 'user-a',
      linkedDocuments: { coverLetter: null },
    });

    const result = await JobsDAO.clearLinkedDocument(
      JOB_ID,
      'user-a',
      'coverLetter'
    );

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: expect.any(Object), firebaseUid: 'user-a' },
      {
        $set: expect.objectContaining({ 'linkedDocuments.coverLetter': null }),
      },
      { returnDocument: 'after' }
    );
    expect(result).not.toBeNull();
  });

  it('returns null for an invalid jobId without calling the DB', async () => {
    const result = await JobsDAO.clearLinkedDocument(
      'bad-id',
      'user-a',
      'resume'
    );
    expect(result).toBeNull();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe('JobsDAO.clearLinkedDocumentReferences', () => {
  const DOC_ID = '507f1f77bcf86cd799439012';

  beforeEach(async () => {
    vi.clearAllMocks();
    await JobsDAO.injectDB(mockConn);
  });

  it('clears both resume and coverLetter links for the owner that reference the deleted document', async () => {
    mockUpdateMany.mockResolvedValue({ modifiedCount: 1 });

    await JobsDAO.clearLinkedDocumentReferences('user-a', DOC_ID);

    expect(mockUpdateMany).toHaveBeenCalledWith(
      { firebaseUid: 'user-a', 'linkedDocuments.resume': expect.any(Object) },
      { $set: { 'linkedDocuments.resume': null } }
    );
    expect(mockUpdateMany).toHaveBeenCalledWith(
      { firebaseUid: 'user-a', 'linkedDocuments.coverLetter': expect.any(Object) },
      { $set: { 'linkedDocuments.coverLetter': null } }
    );
  });
});

describe('JobsDAO.updateResearchNotes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await JobsDAO.injectDB(mockConn);
  });

  it('updates research notes and sets timestamps', async () => {
    const notes =
      'Company focuses on AI research, cloud infrastructure, and developer tools.';

    mockFindOneAndUpdate.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      firebaseUid: 'user-a',
      researchNotes: notes,
      researchUpdatedAt: new Date(),
    });

    const result = await JobsDAO.updateResearchNotes(
      '507f1f77bcf86cd799439011',
      'user-a',
      notes
    );

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: expect.any(Object),
        firebaseUid: 'user-a',
      },
      {
        $set: {
          researchNotes: notes,
          researchUpdatedAt: expect.any(Date),
          lastActivityAt: expect.any(Date),
        },
      },
      {
        returnDocument: 'after',
      }
    );

    expect(result.researchNotes).toBe(notes);
  });

  it('returns null for an invalid job id', async () => {
    const result = await JobsDAO.updateResearchNotes(
      'bad-id',
      'user-a',
      'Some research notes'
    );

    expect(result).toBeNull();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns null when the job is not owned by the user', async () => {
    mockFindOneAndUpdate.mockResolvedValue(null);

    const result = await JobsDAO.updateResearchNotes(
      '507f1f77bcf86cd799439011',
      'wrong-user',
      'Some research notes'
    );

    expect(result).toBeNull();

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: expect.any(Object),
        firebaseUid: 'wrong-user',
      },
      {
        $set: {
          researchNotes: 'Some research notes',
          researchUpdatedAt: expect.any(Date),
          lastActivityAt: expect.any(Date),
        },
      },
      {
        returnDocument: 'after',
      }
    );
  });
});

describe('JobsDAO.updateInterviewPrepNotes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await JobsDAO.injectDB(mockConn);
  });

  it('updates interview prep notes and sets timestamps', async () => {
    const notes =
      'Review system design prompts, STAR stories, and measurable outcomes.';

    mockFindOneAndUpdate.mockResolvedValue({
      value: {
        _id: '507f1f77bcf86cd799439011',
        firebaseUid: 'user-a',
        interviewPrepNotes: notes,
        interviewPrepUpdatedAt: new Date(),
      },
    });

    const result = await JobsDAO.updateInterviewPrepNotes(
      '507f1f77bcf86cd799439011',
      'user-a',
      notes
    );

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: expect.any(Object),
        firebaseUid: 'user-a',
      },
      {
        $set: {
          interviewPrepNotes: notes,
          interviewPrepUpdatedAt: expect.any(Date),
          lastActivityAt: expect.any(Date),
        },
      },
      {
        returnDocument: 'after',
      }
    );

    expect(result.interviewPrepNotes).toBe(notes);
  });

  it('returns null for an invalid job id', async () => {
    const result = await JobsDAO.updateInterviewPrepNotes(
      'bad-id',
      'user-a',
      'Some interview prep notes'
    );

    expect(result).toBeNull();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns null when the job is not owned by the user', async () => {
    mockFindOneAndUpdate.mockResolvedValue({ value: null });

    const result = await JobsDAO.updateInterviewPrepNotes(
      '507f1f77bcf86cd799439011',
      'wrong-user',
      'Some interview prep notes'
    );

    expect(result?.value).toBeNull();

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: expect.any(Object),
        firebaseUid: 'wrong-user',
      },
      {
        $set: {
          interviewPrepNotes: 'Some interview prep notes',
          interviewPrepUpdatedAt: expect.any(Date),
          lastActivityAt: expect.any(Date),
        },
      },
      {
        returnDocument: 'after',
      }
    );
  });
});

describe('JobsDAO.getVelocity', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await JobsDAO.injectDB(mockConn);
  });

  it('counts Interested to Applied transitions within the last 7 days', async () => {
    mockAggregate.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          velocity: 3,
        },
      ]),
    });

    const result = await JobsDAO.getVelocity('user-a');

    expect(mockAggregate).toHaveBeenCalledWith([
      {
        $match: {
          firebaseUid: 'user-a',
        },
      },
      {
        $unwind: '$stageHistory',
      },
      {
        $match: {
          'stageHistory.fromStage': 'Interested',
          'stageHistory.toStage': 'Applied',
          'stageHistory.changedAt': {
            $gte: expect.any(String),
          },
        },
      },
      {
        $count: 'velocity',
      },
    ]);

    expect(result).toBe(3);
  });

  it('returns 0 when there are no velocity events', async () => {
    mockAggregate.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    });

    const result = await JobsDAO.getVelocity('user-a');

    expect(result).toBe(0);
  });
});

describe('JobsDAO.getStageConversion', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await JobsDAO.injectDB(mockConn);
  });

  it('calculates Applied to Interview conversion within 14 days', async () => {
    mockFind.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          firebaseUid: 'user-a',
          stageHistory: [
            {
              fromStage: 'Interested',
              toStage: 'Applied',
              changedAt: '2026-07-01T00:00:00.000Z',
            },
            {
              fromStage: 'Applied',
              toStage: 'Interview',
              changedAt: '2026-07-05T00:00:00.000Z',
            },
          ],
        },
      ]),
    });

    const result = await JobsDAO.getStageConversion('user-a');

    expect(mockFind).toHaveBeenCalledWith({
      firebaseUid: 'user-a',
    });

    expect(result).toBe(1);
  });

  it('returns 0 when there are no conversions', async () => {
    mockFind.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          firebaseUid: 'user-a',
          stageHistory: [
            {
              fromStage: 'Interested',
              toStage: 'Applied',
              changedAt: '2026-07-01T00:00:00.000Z',
            },
          ],
        },
      ]),
    });

    const result = await JobsDAO.getStageConversion('user-a');

    expect(mockFind).toHaveBeenCalledWith({
      firebaseUid: 'user-a',
    });

    expect(result).toBe(0);
  });
});

describe('JobsDAO.getTimeInStage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await JobsDAO.injectDB(mockConn);
  });

  it('calculates average time spent in each stage', async () => {
    mockFind.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          firebaseUid: 'user-a',
          stageHistory: [
            {
              toStage: 'Applied',
              changedAt: '2026-07-01T00:00:00.000Z',
            },
            {
              toStage: 'Interview',
              changedAt: '2026-07-06T00:00:00.000Z',
            },
          ],
        },
      ]),
    });

    const result = await JobsDAO.getTimeInStage('user-a');

    expect(mockFind).toHaveBeenCalledWith({
      firebaseUid: 'user-a',
    });

    expect(result.Applied).toBe(5);
  });
});
