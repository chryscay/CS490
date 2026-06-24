import request from 'supertest';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import app from './app.js';
import JobsDAO from './dao/jobsDAO.js';

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
    deleteJob: vi.fn(),
    appendStageTransition: vi.fn(),
  },
}));
describe('POST /api/jobs/:id/transition', () => {
  const ID = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('performs a forward transition without confirmation (happy path)', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID, firebaseUid: 'user-a', stage: 'Interested',
    });
    JobsDAO.appendStageTransition.mockResolvedValue({
      _id: ID, firebaseUid: 'user-a', stage: 'Applied', stageHistory: [{}],
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

  it('blocks a non-forward transition until confirmed (409)', async () => {
    JobsDAO.findByIdForOwner.mockResolvedValue({
      _id: ID, firebaseUid: 'user-a', stage: 'Applied',
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
      _id: ID, firebaseUid: 'user-a', stage: 'Applied',
    });
    JobsDAO.appendStageTransition.mockResolvedValue({
      _id: ID, firebaseUid: 'user-a', stage: 'Interested', stageHistory: [{}],
    });

    const res = await request(app)
      .post(`/api/jobs/${ID}/transition`)
      .set('Authorization', 'Bearer faketoken')
      .send({ toStage: 'Interested', confirmOverride: true, note: 'reopening' });

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
      _id: ID, firebaseUid: 'user-a', stage: 'Archived',
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
      _id: ID, firebaseUid: 'user-a', stage: 'Interested',
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

describe('DELETE /api/jobs/:id', () => {
  const ID = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('deletes an owned job (happy path + ownership scoping)', async () => {
    JobsDAO.deleteJob.mockResolvedValue({
      _id: ID, firebaseUid: 'user-a', company: 'Acme',
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

