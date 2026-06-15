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
  },
}));

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
      });

    expect(res.status).toBe(201);
    expect(JobsDAO.addJob).toHaveBeenCalledWith(
      expect.objectContaining({
        firebaseUid: 'user-a',
        company: 'Acme',
        title: 'Backend Engineer',
        jobPostingBody: 'We are hiring a backend engineer.',
        stage: 'Interested',
      })
    );
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
      expect.objectContaining({ company: 'Acme', stage: 'Applied' })
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
});


