import request from 'supertest';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import app from './app.js';
import JobsDAO from './dao/jobsDAO.js';
import UsersDAO from './dao/usersDAO.js';
import DocumentsDAO from './dao/documentsDAO.js';
import * as AiDraftService from './services/aiDraft.service.js';

const mockVerifyIdToken = vi.fn();

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: mockVerifyIdToken,
  }),
}));

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  cert: vi.fn(),
}));

vi.mock('./dao/jobsDAO.js', () => ({
  default: {
    addJob: vi.fn(),
    findByOwner: vi.fn(),
    findByIdForOwner: vi.fn(),
    updateJob: vi.fn(),
    updateResearchNotes: vi.fn(),
    deleteJob: vi.fn(),
    appendStageTransition: vi.fn(),
    addInterview: vi.fn(),
    updateInterview: vi.fn(),
    addFollowUp: vi.fn(),
    updateFollowUp: vi.fn(),
  },
}));
vi.mock('./dao/usersDAO.js', () => ({
  default: {
    getProfile: vi.fn(),
  },
}));
vi.mock('./dao/documentsDAO.js', () => ({
  default: {
    saveDocumentVersion: vi.fn(),
    findByJobForOwner: vi.fn(),
  },
}));
vi.mock('./services/aiDraft.service.js', () => ({
  generateAiDraft: vi.fn(),
  rewriteAiDraft: vi.fn(),
}));
describe('POST /api/jobs/:id/transition', () => {
  const ID = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('performs a forward transition without confirmation (happy path)', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      stage: 'Interested',
    });
    JobsDAO.appendStageTransition.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      stage: 'Applied',
      stageHistory: [{}],
    });

    const res = await request(app)
      .post(`/api/jobs/${ID}/transition`)
      .set('Authorization', 'Bearer faketoken')
      .send({ toStage: 'Applied' });

    expect(res.status).toBe(200);
    expect(res.body.job.stage).toBe('Applied');
    expect(JobsDAO.appendStageTransition).toHaveBeenCalledWith(
      ID,
      'user-a',
      expect.objectContaining({
        fromStage: 'Interested',
        toStage: 'Applied',
        isOverride: false,
        changedBy: 'user-a',
        note: '',
        id: expect.any(String),
        changedAt: expect.any(String),
      })
    );
  });

  // S2-013: forward into an outcome stage keeps the note (happy path)
  it('preserves the note transitioning into an outcome stage', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      stage: 'Interview',
    });
    JobsDAO.appendStageTransition.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      stage: 'Offer',
      stageHistory: [{}],
    });

    const res = await request(app)
      .post(`/api/jobs/${ID}/transition`)
      .set('Authorization', 'Bearer faketoken')
      .send({ toStage: 'Offer', note: 'Verbal offer, awaiting written' });

    expect(res.status).toBe(200);
    const entry = JobsDAO.appendStageTransition.mock.calls[0][2];
    expect(entry.toStage).toBe('Offer');
    expect(entry.isOverride).toBe(false);
    expect(entry.note).toBe('Verbal offer, awaiting written');
  });

  // S2-013: forward into a non-outcome stage drops the note (gating boundary)
  it('discards the note transitioning into a non-outcome stage', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      stage: 'Interested',
    });
    JobsDAO.appendStageTransition.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      stage: 'Applied',
      stageHistory: [{}],
    });

    const res = await request(app)
      .post(`/api/jobs/${ID}/transition`)
      .set('Authorization', 'Bearer faketoken')
      .send({ toStage: 'Applied', note: 'should not be saved' });

    expect(res.status).toBe(200);
    expect(JobsDAO.appendStageTransition.mock.calls[0][2].note).toBe('');
  });

  // S2-013: the entry handed to the writer carries note + identity (persistence)
  it('hands the outcome note + identity to the DAO writer', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      stage: 'Applied',
    });
    JobsDAO.appendStageTransition.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      stage: 'Rejected',
      stageHistory: [{}],
    });

    await request(app)
      .post(`/api/jobs/${ID}/transition`)
      .set('Authorization', 'Bearer faketoken')
      .send({ toStage: 'Rejected', note: 'Position filled internally' });

    expect(JobsDAO.appendStageTransition).toHaveBeenCalledWith(
      ID,
      'user-a',
      expect.objectContaining({
        toStage: 'Rejected',
        note: 'Position filled internally',
        changedBy: 'user-a',
      })
    );
  });

  it('blocks a non-forward transition until confirmed (409)', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      stage: 'Applied',
    });

    const res = await request(app)
      .post(`/api/jobs/${ID}/transition`)
      .set('Authorization', 'Bearer faketoken')
      .send({ toStage: 'Interested' });

    expect(res.status).toBe(409);
    expect(res.body.requiresConfirmation).toBe(true);
    expect(JobsDAO.appendStageTransition).not.toHaveBeenCalled();
  });

  it('writes an override entry when confirmed (logs identity + note)', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      stage: 'Applied',
    });
    JobsDAO.appendStageTransition.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      stage: 'Interested',
      stageHistory: [{}],
    });

    const res = await request(app)
      .post(`/api/jobs/${ID}/transition`)
      .set('Authorization', 'Bearer faketoken')
      .send({
        toStage: 'Interested',
        confirmOverride: true,
        note: 'reopening',
      });

    expect(res.status).toBe(200);
    expect(JobsDAO.appendStageTransition).toHaveBeenCalledWith(
      ID,
      'user-a',
      expect.objectContaining({
        fromStage: 'Applied',
        toStage: 'Interested',
        isOverride: true,
        note: 'reopening',
        changedBy: 'user-a',
      })
    );
  });

  it('treats leaving Archived as an override (terminal stage, S2-BR-006)', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      stage: 'Archived',
    });

    const res = await request(app)
      .post(`/api/jobs/${ID}/transition`)
      .set('Authorization', 'Bearer faketoken')
      .send({ toStage: 'Applied' });

    expect(res.status).toBe(409);
    expect(res.body.requiresConfirmation).toBe(true);
    expect(JobsDAO.appendStageTransition).not.toHaveBeenCalled();
  });

  it('rejects an invalid target stage (400)', async () => {
    const res = await request(app)
      .post(`/api/jobs/${ID}/transition`)
      .set('Authorization', 'Bearer faketoken')
      .send({ toStage: 'Hired' });

    expect(res.status).toBe(400);
    expect(JobsDAO.findByIdForOwner).not.toHaveBeenCalled();
    expect(JobsDAO.appendStageTransition).not.toHaveBeenCalled();
  });

  it('rejects a no-op transition to the same stage (400)', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      stage: 'Interested',
    });

    const res = await request(app)
      .post(`/api/jobs/${ID}/transition`)
      .set('Authorization', 'Bearer faketoken')
      .send({ toStage: 'Interested' });

    expect(res.status).toBe(400);
    expect(JobsDAO.appendStageTransition).not.toHaveBeenCalled();
  });

  it('denies a cross-user transition (404)', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-b', email: 'b@test.com' });
    JobsDAO.findByIdForOwner.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/jobs/${ID}/transition`)
      .set('Authorization', 'Bearer faketoken')
      .send({ toStage: 'Applied' });

    expect(res.status).toBe(404);
    expect(JobsDAO.findByIdForOwner).toHaveBeenCalledWith(ID, 'user-b');
    expect(JobsDAO.appendStageTransition).not.toHaveBeenCalled();
  });

  it('blocks unauthenticated requests (401)', async () => {
    const res = await request(app)
      .post(`/api/jobs/${ID}/transition`)
      .send({ toStage: 'Applied' });

    expect(res.status).toBe(401);
    expect(JobsDAO.appendStageTransition).not.toHaveBeenCalled();
  });
});
describe('POST /api/jobs/:id/ai/draft', () => {
  const ID = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('returns a resume draft for an owned job', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      company: 'Acme',
      title: 'Backend Engineer',
      jobPostingBody: 'Build services',
    });
    UsersDAO.getProfile.mockResolvedValue({
      firstName: 'Alice',
      lastName: 'Developer',
      summary: 'Experienced backend engineer',
      skills: [{ name: 'Node.js' }],
    });
    AiDraftService.generateAiDraft.mockResolvedValue('Generated resume draft');

    const res = await request(app)
      .post(`/api/jobs/${ID}/ai/draft`)
      .set('Authorization', 'Bearer faketoken')
      .send({ type: 'resume' });

    expect(res.status).toBe(200);
    expect(res.body.draft).toBe('Generated resume draft');
    expect(JobsDAO.findByIdForOwner).toHaveBeenCalledWith(ID, 'user-a');
    expect(UsersDAO.getProfile).toHaveBeenCalledWith('user-a');
  });

  it('returns a cover letter draft for an owned job', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      company: 'Acme',
      title: 'Backend Engineer',
      jobPostingBody: 'Build services',
    });
    UsersDAO.getProfile.mockResolvedValue({
      firstName: 'Alice',
      lastName: 'Developer',
      summary: 'Experienced backend engineer',
      skills: [{ name: 'Node.js' }],
    });
    AiDraftService.generateAiDraft.mockResolvedValue(
      'Generated cover letter draft'
    );

    const res = await request(app)
      .post(`/api/jobs/${ID}/ai/draft`)
      .set('Authorization', 'Bearer faketoken')
      .send({ type: 'coverLetter' });

    expect(res.status).toBe(200);
    expect(res.body.draft).toBe('Generated cover letter draft');
    expect(JobsDAO.findByIdForOwner).toHaveBeenCalledWith(ID, 'user-a');
    expect(UsersDAO.getProfile).toHaveBeenCalledWith('user-a');
    expect(AiDraftService.generateAiDraft).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'coverLetter' })
    );
  });

  it('denies cross-user access with 404 before profile fetch', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-b', email: 'b@test.com' });
    JobsDAO.findByIdForOwner.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/jobs/${ID}/ai/draft`)
      .set('Authorization', 'Bearer faketoken')
      .send({ type: 'coverLetter' });

    expect(res.status).toBe(404);
    expect(JobsDAO.findByIdForOwner).toHaveBeenCalledWith(ID, 'user-b');
    expect(UsersDAO.getProfile).not.toHaveBeenCalled();
    expect(AiDraftService.generateAiDraft).not.toHaveBeenCalled();
  });

  it('returns 502 when AI draft service fails', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      company: 'Acme',
      title: 'Backend Engineer',
      jobPostingBody: 'Build services',
    });
    UsersDAO.getProfile.mockResolvedValue({});
    AiDraftService.generateAiDraft.mockRejectedValue(
      new Error('OpenAI unreachable')
    );

    const res = await request(app)
      .post(`/api/jobs/${ID}/ai/draft`)
      .set('Authorization', 'Bearer faketoken')
      .send({ type: 'coverLetter' });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('Failed to generate draft');
  });

  it('rejects unsupported draft types with 400', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      company: 'Acme',
      title: 'Backend Engineer',
      jobPostingBody: 'Build services',
    });

    const res = await request(app)
      .post(`/api/jobs/${ID}/ai/draft`)
      .set('Authorization', 'Bearer faketoken')
      .send({ type: 'portfolio' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Unsupported draft type');
    expect(JobsDAO.findByIdForOwner).not.toHaveBeenCalled();
    expect(UsersDAO.getProfile).not.toHaveBeenCalled();
    expect(AiDraftService.generateAiDraft).not.toHaveBeenCalled();
  });
});

describe('POST /api/jobs/:id/ai/rewrite', () => {
  const ID = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('returns a rewritten draft for an owned job', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      company: 'Acme',
      title: 'Backend Engineer',
      jobPostingBody: 'Build services',
    });
    UsersDAO.getProfile.mockResolvedValue({ firstName: 'Alice' });
    AiDraftService.rewriteAiDraft.mockResolvedValue('Improved draft text');

    const res = await request(app)
      .post(`/api/jobs/${ID}/ai/rewrite`)
      .set('Authorization', 'Bearer faketoken')
      .send({
        type: 'resume',
        text: 'Original draft text',
        instruction: 'Make it concise and achievement-focused',
      });

    expect(res.status).toBe(200);
    expect(res.body.draft).toBe('Improved draft text');
    expect(JobsDAO.findByIdForOwner).toHaveBeenCalledWith(ID, 'user-a');
    expect(UsersDAO.getProfile).toHaveBeenCalledWith('user-a');
    expect(AiDraftService.rewriteAiDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'resume',
        text: 'Original draft text',
        instruction: 'Make it concise and achievement-focused',
      })
    );
  });

  it('returns 400 when draft text is missing', async () => {
    const res = await request(app)
      .post(`/api/jobs/${ID}/ai/rewrite`)
      .set('Authorization', 'Bearer faketoken')
      .send({ type: 'coverLetter', text: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Draft text is required');
    expect(JobsDAO.findByIdForOwner).not.toHaveBeenCalled();
    expect(UsersDAO.getProfile).not.toHaveBeenCalled();
    expect(AiDraftService.rewriteAiDraft).not.toHaveBeenCalled();
  });

  it('returns 404 for cross-user access before profile fetch', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-b', email: 'b@test.com' });
    JobsDAO.findByIdForOwner.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/jobs/${ID}/ai/rewrite`)
      .set('Authorization', 'Bearer faketoken')
      .send({ type: 'coverLetter', text: 'Existing cover letter draft' });

    expect(res.status).toBe(404);
    expect(JobsDAO.findByIdForOwner).toHaveBeenCalledWith(ID, 'user-b');
    expect(UsersDAO.getProfile).not.toHaveBeenCalled();
    expect(AiDraftService.rewriteAiDraft).not.toHaveBeenCalled();
  });

  it('returns 502 when AI rewrite service fails', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      company: 'Acme',
      title: 'Backend Engineer',
      jobPostingBody: 'Build services',
    });
    UsersDAO.getProfile.mockResolvedValue({});
    AiDraftService.rewriteAiDraft.mockRejectedValue(
      new Error('OpenAI unreachable')
    );

    const res = await request(app)
      .post(`/api/jobs/${ID}/ai/rewrite`)
      .set('Authorization', 'Bearer faketoken')
      .send({
        type: 'coverLetter',
        text: 'Draft to improve',
        instruction: 'Make it more persuasive',
      });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('Failed to rewrite draft');
  });
});

describe('POST /api/jobs/:id/documents', () => {
  const ID = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('saves a resume document version for an owned job', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      title: 'Backend Engineer',
    });
    DocumentsDAO.saveDocumentVersion.mockResolvedValue({
      _id: 'doc-1',
      type: 'resume',
      title: 'Backend Engineer Resume',
      currentVersion: 1,
      updatedAt: '2026-06-28T00:00:00.000Z',
      versions: [{ version: 1, text: 'Edited resume draft' }],
    });

    const res = await request(app)
      .post(`/api/jobs/${ID}/documents`)
      .set('Authorization', 'Bearer faketoken')
      .send({ type: 'resume', text: 'Edited resume draft' });

    expect(res.status).toBe(201);
    expect(res.body.document.currentVersion).toBe(1);
    expect(res.body.document.versions).toBeUndefined();
    expect(JobsDAO.findByIdForOwner).toHaveBeenCalledWith(ID, 'user-a');
    expect(DocumentsDAO.saveDocumentVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        firebaseUid: 'user-a',
        jobId: ID,
        type: 'resume',
        text: 'Edited resume draft',
        title: 'Backend Engineer Resume',
      })
    );
  });

  it('saves a cover letter document version for an owned job', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      title: 'Platform Engineer',
    });
    DocumentsDAO.saveDocumentVersion.mockResolvedValue({
      _id: 'doc-2',
      type: 'coverLetter',
      currentVersion: 1,
    });

    const res = await request(app)
      .post(`/api/jobs/${ID}/documents`)
      .set('Authorization', 'Bearer faketoken')
      .send({ type: 'coverLetter', text: 'Edited cover letter draft' });

    expect(res.status).toBe(201);
    expect(res.body.document.type).toBe('coverLetter');
    expect(DocumentsDAO.saveDocumentVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'coverLetter',
        title: 'Platform Engineer Cover Letter',
      })
    );
  });

  it('returns 400 for unsupported document type', async () => {
    const res = await request(app)
      .post(`/api/jobs/${ID}/documents`)
      .set('Authorization', 'Bearer faketoken')
      .send({ type: 'portfolio', text: 'Some text' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Unsupported document type');
    expect(JobsDAO.findByIdForOwner).not.toHaveBeenCalled();
    expect(DocumentsDAO.saveDocumentVersion).not.toHaveBeenCalled();
  });

  it('returns 400 for blank draft text', async () => {
    const res = await request(app)
      .post(`/api/jobs/${ID}/documents`)
      .set('Authorization', 'Bearer faketoken')
      .send({ type: 'resume', text: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Draft text is required');
    expect(JobsDAO.findByIdForOwner).not.toHaveBeenCalled();
    expect(DocumentsDAO.saveDocumentVersion).not.toHaveBeenCalled();
  });

  it('returns 404 for a cross-user job before document save', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-b', email: 'b@test.com' });
    JobsDAO.findByIdForOwner.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/jobs/${ID}/documents`)
      .set('Authorization', 'Bearer faketoken')
      .send({ type: 'resume', text: 'User B should not save this' });

    expect(res.status).toBe(404);
    expect(JobsDAO.findByIdForOwner).toHaveBeenCalledWith(ID, 'user-b');
    expect(DocumentsDAO.saveDocumentVersion).not.toHaveBeenCalled();
  });

  it('returns 500 when saveDocumentVersion fails', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      title: 'Backend Engineer',
    });
    DocumentsDAO.saveDocumentVersion.mockRejectedValue(new Error('db down'));

    const res = await request(app)
      .post(`/api/jobs/${ID}/documents`)
      .set('Authorization', 'Bearer faketoken')
      .send({ type: 'resume', text: 'Edited resume draft' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to save document');
  });
});

describe('GET /api/jobs/:id/documents', () => {
  const ID = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('returns saved documents for an owned job (happy path + persistence)', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      title: 'Backend Engineer',
    });
    DocumentsDAO.findByJobForOwner.mockResolvedValue([
      {
        _id: 'doc-1',
        type: 'resume',
        title: 'Backend Engineer Resume',
        currentVersion: 2,
        updatedAt: '2026-06-28T00:00:00.000Z',
        text: 'Latest resume draft text',
      },
    ]);

    const res = await request(app)
      .get(`/api/jobs/${ID}/documents`)
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(200);
    expect(res.body.documents).toHaveLength(1);
    expect(res.body.documents[0].text).toBe('Latest resume draft text');
    expect(res.body.documents[0].currentVersion).toBe(2);
    expect(JobsDAO.findByIdForOwner).toHaveBeenCalledWith(ID, 'user-a');
    expect(DocumentsDAO.findByJobForOwner).toHaveBeenCalledWith('user-a', ID);
  });

  it('returns an empty array when the job has no saved documents', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      title: 'Backend Engineer',
    });
    DocumentsDAO.findByJobForOwner.mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/jobs/${ID}/documents`)
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(200);
    expect(res.body.documents).toEqual([]);
  });

  it('denies cross-user access with 404 before fetching documents', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-b', email: 'b@test.com' });
    JobsDAO.findByIdForOwner.mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/jobs/${ID}/documents`)
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(404);
    expect(JobsDAO.findByIdForOwner).toHaveBeenCalledWith(ID, 'user-b');
    expect(DocumentsDAO.findByJobForOwner).not.toHaveBeenCalled();
  });

  it('blocks unauthenticated requests (401)', async () => {
    const res = await request(app).get(`/api/jobs/${ID}/documents`);

    expect(res.status).toBe(401);
    expect(DocumentsDAO.findByJobForOwner).not.toHaveBeenCalled();
  });

  it('returns 500 when the documents lookup fails', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      title: 'Backend Engineer',
    });
    DocumentsDAO.findByJobForOwner.mockRejectedValue(new Error('db down'));

    const res = await request(app)
      .get(`/api/jobs/${ID}/documents`)
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to fetch documents');
  });
});

describe('POST /api/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({
      uid: 'user-a',
      email: 'a@test.com',
    });
  });

  it('creates a job for the authenticated user (happy path)', async () => {
    JobsDAO.addJob.mockResolvedValue({ insertedId: 'job-1' });

    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', 'Bearer faketoken')
      .send({
        company: 'Acme',
        title: 'Backend Engineer',
        jobPostingBody: 'We are hiring a backend engineer.',
        deadline: '2026-06-30',
        recruiterName: 'Jane Recruiter',
        contactNotes: 'Email after applying',
      });

    expect(res.status).toBe(201);
    expect(JobsDAO.addJob).toHaveBeenCalledWith(
      expect.objectContaining({
        firebaseUid: 'user-a',
        company: 'Acme',
        title: 'Backend Engineer',
        jobPostingBody: 'We are hiring a backend engineer.',
        stage: 'Interested',
        deadline: expect.any(Date),
        recruiterName: 'Jane Recruiter',
        contactNotes: 'Email after applying',
      })
    );
  });

  it('rejects invalid deadline (400)', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', 'Bearer faketoken')
      .send({
        company: 'Acme',
        title: 'Backend Engineer',
        jobPostingBody: 'We are hiring a backend engineer.',
        deadline: 'not-a-date',
      });

    expect(res.status).toBe(400);
    expect(JobsDAO.addJob).not.toHaveBeenCalled();
  });

  it('rejects missing required fields (400)', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', 'Bearer faketoken')
      .send({ company: 'Acme' });

    expect(res.status).toBe(400);
    expect(JobsDAO.addJob).not.toHaveBeenCalled();
  });

  it('blocks unauthenticated requests (401)', async () => {
    const res = await request(app).post('/api/jobs').send({
      company: 'Acme',
      title: 'Backend Engineer',
      jobPostingBody: 'We are hiring.',
    });

    expect(res.status).toBe(401);
    expect(JobsDAO.addJob).not.toHaveBeenCalled();
  });
});

describe('GET /api/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({
      uid: 'user-a',
      email: 'a@test.com',
    });
  });

  it('returns only the authenticated user jobs (persistence + ownership scoping)', async () => {
    JobsDAO.findByOwner.mockResolvedValue([
      { _id: 'job-1', firebaseUid: 'user-a', company: 'Acme' },
    ]);

    const res = await request(app)
      .get('/api/jobs')
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(200);
    expect(JobsDAO.findByOwner).toHaveBeenCalledWith('user-a');
    expect(res.body.jobs).toHaveLength(1);
  });

  it('blocks protected job access when no valid token is provided', async () => {
    // Covers the protected API no-valid-token path after logout removes the client token.
    mockVerifyIdToken.mockRejectedValue(new Error('expired token'));

    const res = await request(app)
      .get('/api/jobs')
      .set('Authorization', 'Bearer expiredtoken');

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid or expired token/i);
    expect(JobsDAO.findByOwner).not.toHaveBeenCalled();
  });
});

describe('GET /api/jobs/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({
      uid: 'user-b',
      email: 'b@test.com',
    });
  });

  it('denies cross-user access to another user job (404)', async () => {
    // user-b is authenticated; the job belongs to user-a.
    // The DAO filters by owner, so it returns null for user-b.
    JobsDAO.findByIdForOwner.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/jobs/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(404);
    expect(JobsDAO.findByIdForOwner).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      'user-b'
    );
  });

  it('returns the job when the owner requests it (happy path)', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      firebaseUid: 'user-b',
      company: 'Acme',
    });

    const res = await request(app)
      .get('/api/jobs/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(200);
    expect(res.body.job.company).toBe('Acme');
  });
});

describe('PUT /api/jobs/:id', () => {
  const validBody = {
    company: 'Acme',
    title: 'Engineer',
    jobPostingBody: 'Body text here',
    stage: 'Applied',
    deadline: '2026-06-30',
    recruiterName: 'Jane Recruiter',
    contactNotes: 'Email after applying',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({
      uid: 'user-a',
      email: 'a@test.com',
    });
  });

  it('updates an owned job (happy path + persistence)', async () => {
    JobsDAO.updateJob.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      firebaseUid: 'user-a',
      ...validBody,
    });

    const res = await request(app)
      .put('/api/jobs/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer faketoken')
      .send(validBody);

    expect(res.status).toBe(200);
    expect(JobsDAO.updateJob).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      'user-a',
      expect.objectContaining({
        company: 'Acme',
        stage: 'Applied',
        deadline: expect.any(Date),
        recruiterName: 'Jane Recruiter',
        contactNotes: 'Email after applying',
      })
    );
  });

  it('denies cross-user update: user B cannot update user A job (404)', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-b', email: 'b@test.com' });
    JobsDAO.updateJob.mockResolvedValue(null);

    const res = await request(app)
      .put('/api/jobs/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer faketoken')
      .send(validBody);

    expect(res.status).toBe(404);
    expect(JobsDAO.updateJob).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      'user-b',
      expect.any(Object)
    );
  });

  it('rejects missing required fields (400)', async () => {
    const res = await request(app)
      .put('/api/jobs/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer faketoken')
      .send({ company: 'Acme' });

    expect(res.status).toBe(400);
    expect(JobsDAO.updateJob).not.toHaveBeenCalled();
  });

  it('rejects an invalid stage (400)', async () => {
    const res = await request(app)
      .put('/api/jobs/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer faketoken')
      .send({ ...validBody, stage: 'Hired' });

    expect(res.status).toBe(400);
    expect(JobsDAO.updateJob).not.toHaveBeenCalled();
  });

  it('rejects invalid deadline (400)', async () => {
    const res = await request(app)
      .put('/api/jobs/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer faketoken')
      .send({ ...validBody, deadline: 'not-a-date' });

    expect(res.status).toBe(400);
    expect(JobsDAO.updateJob).not.toHaveBeenCalled();
  });
});

describe('POST /api/jobs/:id/interviews', () => {
  const ID = '507f1f77bcf86cd799439011';
  const validBody = {
    roundType: 'Technical Screen',
    scheduledAt: '2026-08-01T14:00:00.000Z',
    notes: 'Focus on algorithms and data structures.',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('adds an interview entry (happy path)', async () => {
    const updatedJob = {
      _id: ID,
      firebaseUid: 'user-a',
      stage: 'Interview',
      interviews: [{ id: 'uuid', ...validBody }],
    };
    JobsDAO.addInterview.mockResolvedValue(updatedJob);

    const res = await request(app)
      .post(`/api/jobs/${ID}/interviews`)
      .set('Authorization', 'Bearer faketoken')
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.job.interviews).toHaveLength(1);
    expect(JobsDAO.addInterview).toHaveBeenCalledWith(
      ID,
      'user-a',
      expect.objectContaining({
        roundType: 'Technical Screen',
        scheduledAt: expect.any(String),
        notes: 'Focus on algorithms and data structures.',
        id: expect.any(String),
        createdAt: expect.any(String),
      })
    );
  });

  it('rejects missing required fields (400)', async () => {
    const res = await request(app)
      .post(`/api/jobs/${ID}/interviews`)
      .set('Authorization', 'Bearer faketoken')
      .send({ roundType: 'Technical Screen' });

    expect(res.status).toBe(400);
    expect(JobsDAO.addInterview).not.toHaveBeenCalled();
  });

  it('rejects an invalid scheduledAt date (400)', async () => {
    const res = await request(app)
      .post(`/api/jobs/${ID}/interviews`)
      .set('Authorization', 'Bearer faketoken')
      .send({ ...validBody, scheduledAt: 'not-a-date' });

    expect(res.status).toBe(400);
    expect(JobsDAO.addInterview).not.toHaveBeenCalled();
  });

  it('returns 404 when the job is not found', async () => {
    JobsDAO.addInterview.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/jobs/${ID}/interviews`)
      .set('Authorization', 'Bearer faketoken')
      .send(validBody);

    expect(res.status).toBe(404);
  });

  it('blocks unauthenticated requests (401)', async () => {
    const res = await request(app)
      .post(`/api/jobs/${ID}/interviews`)
      .send(validBody);

    expect(res.status).toBe(401);
    expect(JobsDAO.addInterview).not.toHaveBeenCalled();
  });
});

describe('PUT /api/jobs/:id/interviews/:interviewId', () => {
  const ID = '507f1f77bcf86cd799439011';
  const INTERVIEW_ID = 'interview-uuid-1';
  const validBody = {
    roundType: 'System Design',
    scheduledAt: '2026-08-05T10:00:00.000Z',
    notes: 'Design a URL shortener.',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('updates an interview entry (happy path)', async () => {
    const updatedJob = {
      _id: ID,
      firebaseUid: 'user-a',
      stage: 'Interview',
      interviews: [{ id: INTERVIEW_ID, ...validBody }],
    };
    JobsDAO.updateInterview.mockResolvedValue(updatedJob);

    const res = await request(app)
      .put(`/api/jobs/${ID}/interviews/${INTERVIEW_ID}`)
      .set('Authorization', 'Bearer faketoken')
      .send(validBody);

    expect(res.status).toBe(200);
    expect(JobsDAO.updateInterview).toHaveBeenCalledWith(
      ID,
      'user-a',
      INTERVIEW_ID,
      expect.objectContaining({
        roundType: 'System Design',
        scheduledAt: expect.any(String),
        notes: 'Design a URL shortener.',
      })
    );
  });

  it('rejects missing required fields (400)', async () => {
    const res = await request(app)
      .put(`/api/jobs/${ID}/interviews/${INTERVIEW_ID}`)
      .set('Authorization', 'Bearer faketoken')
      .send({ roundType: 'System Design' });

    expect(res.status).toBe(400);
    expect(JobsDAO.updateInterview).not.toHaveBeenCalled();
  });

  it('rejects an invalid scheduledAt date (400)', async () => {
    const res = await request(app)
      .put(`/api/jobs/${ID}/interviews/${INTERVIEW_ID}`)
      .set('Authorization', 'Bearer faketoken')
      .send({ ...validBody, scheduledAt: 'not-a-date' });

    expect(res.status).toBe(400);
    expect(JobsDAO.updateInterview).not.toHaveBeenCalled();
  });

  it('returns 404 when the job or interview is not found', async () => {
    JobsDAO.updateInterview.mockResolvedValue(null);

    const res = await request(app)
      .put(`/api/jobs/${ID}/interviews/${INTERVIEW_ID}`)
      .set('Authorization', 'Bearer faketoken')
      .send(validBody);

    expect(res.status).toBe(404);
  });

  it('blocks unauthenticated requests (401)', async () => {
    const res = await request(app)
      .put(`/api/jobs/${ID}/interviews/${INTERVIEW_ID}`)
      .send(validBody);

    expect(res.status).toBe(401);
    expect(JobsDAO.updateInterview).not.toHaveBeenCalled();
  });
});

describe('POST /api/jobs/:id/followups', () => {
  const ID = '507f1f77bcf86cd799439011';
  const validBody = {
    title: 'Send thank you email',
    dueAt: '2026-08-03T09:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('adds a follow-up (happy path)', async () => {
    const updatedJob = {
      _id: ID,
      followUps: [{ id: 'uuid', ...validBody, completedAt: null }],
    };
    JobsDAO.addFollowUp.mockResolvedValue(updatedJob);

    const res = await request(app)
      .post(`/api/jobs/${ID}/followups`)
      .set('Authorization', 'Bearer faketoken')
      .send(validBody);

    expect(res.status).toBe(201);
    expect(JobsDAO.addFollowUp).toHaveBeenCalledWith(
      ID,
      'user-a',
      expect.objectContaining({
        title: 'Send thank you email',
        dueAt: expect.any(String),
        completedAt: null,
        id: expect.any(String),
        createdAt: expect.any(String),
      })
    );
  });

  it('rejects missing title (400)', async () => {
    const res = await request(app)
      .post(`/api/jobs/${ID}/followups`)
      .set('Authorization', 'Bearer faketoken')
      .send({ dueAt: '2026-08-03T09:00:00.000Z' });

    expect(res.status).toBe(400);
    expect(JobsDAO.addFollowUp).not.toHaveBeenCalled();
  });

  it('rejects missing dueAt (400)', async () => {
    const res = await request(app)
      .post(`/api/jobs/${ID}/followups`)
      .set('Authorization', 'Bearer faketoken')
      .send({ title: 'Send email' });

    expect(res.status).toBe(400);
    expect(JobsDAO.addFollowUp).not.toHaveBeenCalled();
  });

  it('rejects invalid dueAt (400)', async () => {
    const res = await request(app)
      .post(`/api/jobs/${ID}/followups`)
      .set('Authorization', 'Bearer faketoken')
      .send({ ...validBody, dueAt: 'not-a-date' });

    expect(res.status).toBe(400);
    expect(JobsDAO.addFollowUp).not.toHaveBeenCalled();
  });

  it('returns 404 when job not found', async () => {
    JobsDAO.addFollowUp.mockResolvedValue(null);
    const res = await request(app)
      .post(`/api/jobs/${ID}/followups`)
      .set('Authorization', 'Bearer faketoken')
      .send(validBody);

    expect(res.status).toBe(404);
  });

  it('blocks unauthenticated requests (401)', async () => {
    const res = await request(app)
      .post(`/api/jobs/${ID}/followups`)
      .send(validBody);
    expect(res.status).toBe(401);
    expect(JobsDAO.addFollowUp).not.toHaveBeenCalled();
  });
});

describe('PUT /api/jobs/:id/followups/:followUpId', () => {
  const ID = '507f1f77bcf86cd799439011';
  const FU_ID = 'followup-uuid-1';
  const validBody = {
    title: 'Follow up on application',
    dueAt: '2026-08-10T10:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('updates a follow-up (happy path)', async () => {
    const updatedJob = {
      _id: ID,
      followUps: [{ id: FU_ID, ...validBody, completedAt: null }],
    };
    JobsDAO.updateFollowUp.mockResolvedValue(updatedJob);

    const res = await request(app)
      .put(`/api/jobs/${ID}/followups/${FU_ID}`)
      .set('Authorization', 'Bearer faketoken')
      .send(validBody);

    expect(res.status).toBe(200);
    expect(JobsDAO.updateFollowUp).toHaveBeenCalledWith(
      ID,
      'user-a',
      FU_ID,
      expect.objectContaining({
        title: 'Follow up on application',
        completedAt: null,
      })
    );
  });

  it('marks a follow-up complete when completedAt is provided', async () => {
    const completedAt = '2026-08-05T14:00:00.000Z';
    JobsDAO.updateFollowUp.mockResolvedValue({
      _id: ID,
      followUps: [{ id: FU_ID, completedAt }],
    });

    const res = await request(app)
      .put(`/api/jobs/${ID}/followups/${FU_ID}`)
      .set('Authorization', 'Bearer faketoken')
      .send({ ...validBody, completedAt });

    expect(res.status).toBe(200);
    expect(JobsDAO.updateFollowUp.mock.calls[0][3].completedAt).toBe(
      completedAt
    );
  });

  it('rejects invalid completedAt (400)', async () => {
    const res = await request(app)
      .put(`/api/jobs/${ID}/followups/${FU_ID}`)
      .set('Authorization', 'Bearer faketoken')
      .send({ ...validBody, completedAt: 'bad-date' });

    expect(res.status).toBe(400);
    expect(JobsDAO.updateFollowUp).not.toHaveBeenCalled();
  });

  it('returns 404 when job or follow-up not found', async () => {
    JobsDAO.updateFollowUp.mockResolvedValue(null);
    const res = await request(app)
      .put(`/api/jobs/${ID}/followups/${FU_ID}`)
      .set('Authorization', 'Bearer faketoken')
      .send(validBody);

    expect(res.status).toBe(404);
  });

  it('blocks unauthenticated requests (401)', async () => {
    const res = await request(app)
      .put(`/api/jobs/${ID}/followups/${FU_ID}`)
      .send(validBody);
    expect(res.status).toBe(401);
    expect(JobsDAO.updateFollowUp).not.toHaveBeenCalled();
  });
});

describe('POST /api/jobs/:id/archive', () => {
  const ID = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('archives a job in a non-forward stage (Applied -> Archived)', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      stage: 'Applied',
      stageHistory: [],
    });
    JobsDAO.appendStageTransition.mockResolvedValue({
      _id: ID,
      stage: 'Archived',
    });

    const res = await request(app)
      .post(`/api/jobs/${ID}/archive`)
      .set('Authorization', 'Bearer faketoken')
      .send({ note: 'Withdrew application' });

    expect(res.status).toBe(200);
    const entry = JobsDAO.appendStageTransition.mock.calls[0][2];
    expect(entry.fromStage).toBe('Applied');
    expect(entry.toStage).toBe('Archived');
    expect(entry.isOverride).toBe(true);
    expect(entry.note).toBe('Withdrew application');
  });

  it('archives a job on the forward path (Offer -> Archived)', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      stage: 'Offer',
      stageHistory: [],
    });
    JobsDAO.appendStageTransition.mockResolvedValue({
      _id: ID,
      stage: 'Archived',
    });

    const res = await request(app)
      .post(`/api/jobs/${ID}/archive`)
      .set('Authorization', 'Bearer faketoken')
      .send({});

    expect(res.status).toBe(200);
    const entry = JobsDAO.appendStageTransition.mock.calls[0][2];
    expect(entry.isOverride).toBe(false);
  });

  it('returns 400 when job is already archived', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      stage: 'Archived',
      stageHistory: [],
    });

    const res = await request(app)
      .post(`/api/jobs/${ID}/archive`)
      .set('Authorization', 'Bearer faketoken')
      .send({});

    expect(res.status).toBe(400);
    expect(JobsDAO.appendStageTransition).not.toHaveBeenCalled();
  });

  it('returns 404 when job is not found', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/jobs/${ID}/archive`)
      .set('Authorization', 'Bearer faketoken')
      .send({});

    expect(res.status).toBe(404);
    expect(JobsDAO.appendStageTransition).not.toHaveBeenCalled();
  });

  it('blocks unauthenticated requests (401)', async () => {
    const res = await request(app).post(`/api/jobs/${ID}/archive`).send({});
    expect(res.status).toBe(401);
    expect(JobsDAO.appendStageTransition).not.toHaveBeenCalled();
  });
});

describe('POST /api/jobs/:id/restore', () => {
  const ID = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('restores a job to the stage it was in before archiving', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      stage: 'Archived',
      stageHistory: [
        {
          id: 'sh-1',
          fromStage: 'Applied',
          toStage: 'Interview',
          changedAt: '2026-06-01T00:00:00.000Z',
        },
        {
          id: 'sh-2',
          fromStage: 'Interview',
          toStage: 'Archived',
          changedAt: '2026-06-10T00:00:00.000Z',
        },
      ],
    });
    JobsDAO.appendStageTransition.mockResolvedValue({
      _id: ID,
      stage: 'Interview',
    });

    const res = await request(app)
      .post(`/api/jobs/${ID}/restore`)
      .set('Authorization', 'Bearer faketoken')
      .send({});

    expect(res.status).toBe(200);
    const entry = JobsDAO.appendStageTransition.mock.calls[0][2];
    expect(entry.fromStage).toBe('Archived');
    expect(entry.toStage).toBe('Interview');
    expect(entry.isOverride).toBe(true);
  });

  it('restores to Interested when stageHistory has no archive entry', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      stage: 'Archived',
      stageHistory: [],
    });
    JobsDAO.appendStageTransition.mockResolvedValue({
      _id: ID,
      stage: 'Interested',
    });

    const res = await request(app)
      .post(`/api/jobs/${ID}/restore`)
      .set('Authorization', 'Bearer faketoken')
      .send({});

    expect(res.status).toBe(200);
    const entry = JobsDAO.appendStageTransition.mock.calls[0][2];
    expect(entry.toStage).toBe('Interested');
  });

  it('returns 400 when job is not archived', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID,
      stage: 'Applied',
      stageHistory: [],
    });

    const res = await request(app)
      .post(`/api/jobs/${ID}/restore`)
      .set('Authorization', 'Bearer faketoken')
      .send({});

    expect(res.status).toBe(400);
    expect(JobsDAO.appendStageTransition).not.toHaveBeenCalled();
  });

  it('returns 404 when job is not found', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/jobs/${ID}/restore`)
      .set('Authorization', 'Bearer faketoken')
      .send({});

    expect(res.status).toBe(404);
    expect(JobsDAO.appendStageTransition).not.toHaveBeenCalled();
  });

  it('blocks unauthenticated requests (401)', async () => {
    const res = await request(app).post(`/api/jobs/${ID}/restore`).send({});
    expect(res.status).toBe(401);
    expect(JobsDAO.appendStageTransition).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/jobs/:id', () => {
  const ID = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('deletes an owned job (happy path + ownership scoping)', async () => {
    JobsDAO.deleteJob.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      company: 'Acme',
    });

    const res = await request(app)
      .delete(`/api/jobs/${ID}`)
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(200);
    expect(JobsDAO.deleteJob).toHaveBeenCalledWith(ID, 'user-a');
  });

  it('denies a cross-user delete: user B cannot delete user A job (404)', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-b', email: 'b@test.com' });
    JobsDAO.deleteJob.mockResolvedValue(null);

    const res = await request(app)
      .delete(`/api/jobs/${ID}`)
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(404);
    expect(JobsDAO.deleteJob).toHaveBeenCalledWith(ID, 'user-b');
  });

  it('blocks unauthenticated requests (401)', async () => {
    const res = await request(app).delete(`/api/jobs/${ID}`);

    expect(res.status).toBe(401);
    expect(JobsDAO.deleteJob).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/jobs/:id/research', () => {
  const ID = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({
      uid: 'user-a',
      email: 'a@test.com',
    });
  });

  it('updates company research notes for an owned job (happy path)', async () => {
    JobsDAO.updateResearchNotes.mockResolvedValue({
      _id: ID,
      firebaseUid: 'user-a',
      researchNotes: 'Company uses AI infrastructure and cloud services.',
    });

    const res = await request(app)
      .patch(`/api/jobs/${ID}/research`)
      .set('Authorization', 'Bearer faketoken')
      .send({
        researchNotes: 'Company uses AI infrastructure and cloud services.',
      });

    expect(res.status).toBe(200);

    expect(res.body.job.researchNotes).toBe(
      'Company uses AI infrastructure and cloud services.'
    );

    expect(JobsDAO.updateResearchNotes).toHaveBeenCalledWith(
      ID,
      'user-a',
      'Company uses AI infrastructure and cloud services.'
    );
  });

  it('rejects empty research notes (400)', async () => {
    const res = await request(app)
      .patch(`/api/jobs/${ID}/research`)
      .set('Authorization', 'Bearer faketoken')
      .send({
        researchNotes: '',
      });

    expect(res.status).toBe(400);

    expect(JobsDAO.updateResearchNotes).not.toHaveBeenCalled();
  });

  it('returns 404 when job does not belong to user', async () => {
    JobsDAO.updateResearchNotes.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/jobs/${ID}/research`)
      .set('Authorization', 'Bearer faketoken')
      .send({
        researchNotes: 'Research information',
      });

    expect(res.status).toBe(404);

    expect(JobsDAO.updateResearchNotes).toHaveBeenCalledWith(
      ID,
      'user-a',
      'Research information'
    );
  });

  it('blocks unauthenticated requests (401)', async () => {
    const res = await request(app).patch(`/api/jobs/${ID}/research`).send({
      researchNotes: 'Unauthorized attempt',
    });

    expect(res.status).toBe(401);

    expect(JobsDAO.updateResearchNotes).not.toHaveBeenCalled();
  });

  it('returns 500 when updating research notes fails', async () => {
    JobsDAO.updateResearchNotes.mockRejectedValue(
      new Error('database failure')
    );

    const res = await request(app)
      .patch(`/api/jobs/${ID}/research`)
      .set('Authorization', 'Bearer faketoken')
      .send({
        researchNotes: 'Some research',
      });

    expect(res.status).toBe(500);

    expect(res.body.error).toBe('Failed to update research notes');
  });
});
