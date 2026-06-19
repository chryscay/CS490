import request from 'supertest';
import express from 'express';
import authMiddleware from './middleware/auth.middleware.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import app from './app.js';
import UsersDAO from './dao/usersDAO.js';

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

vi.mock('./dao/usersDAO.js', () => ({
  default: {
    findByFirebaseUid: vi.fn(),
    findByUsername: vi.fn(),
    addUser: vi.fn(),
  },
}));

// Remove after adding real protected routes just for testing purposes

const testApp = express();

testApp.get('/protected', authMiddleware, (req, res) => {
  res.json(req.user);
});

//

describe('health endpoint', () => {
  it('returns status ok', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockVerifyIdToken.mockResolvedValue({
      uid: 'test-uid',
      email: 'test@test.com',
    });
  });

  it('creates a user (happy path + persistence)', async () => {
    UsersDAO.findByFirebaseUid.mockResolvedValue(null);
    UsersDAO.findByUsername.mockResolvedValue(null);
    UsersDAO.addUser.mockResolvedValue({ insertedId: 'x' });

    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', 'Bearer faketoken')
      .send({ username: 'Chris' });

    expect(res.status).toBe(201);
    expect(UsersDAO.addUser).toHaveBeenCalledWith(
      expect.objectContaining({
        firebaseUid: 'test-uid',
        email: 'test@test.com',
        username: 'chris',
      })
    );
  });

  it('rejects missing auth header (401)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'Chris' });

    expect(res.status).toBe(401);
  });

  it('rejects blank username (400, field-level)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', 'Bearer faketoken')
      .send({ username: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/username is required/i);
  });

  it('rejects duplicate user (409)', async () => {
    UsersDAO.findByFirebaseUid.mockResolvedValue({ firebaseUid: 'test-uid' });

    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', 'Bearer faketoken')
      .send({ username: 'Chris' });

    expect(res.status).toBe(409);
  });

  it('rejects duplicate username (409)', async () => {
    UsersDAO.findByFirebaseUid.mockResolvedValue(null);

    UsersDAO.findByUsername.mockResolvedValue({
      username: 'chris',
    });

    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', 'Bearer faketoken')
      .send({ username: 'Chris' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/username/i);
  });

  it('rejects a username that is too short (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', 'Bearer faketoken')
      .send({ username: 'ab' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/3-20 characters/i);
  });

  it('rejects a username with invalid characters (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', 'Bearer faketoken')
      .send({ username: 'bad name!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/3-20 characters/i);
  });
});

describe('auth middleware (S1-014)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockVerifyIdToken.mockResolvedValue({
      uid: 'test-uid',
      email: 'test@test.com',
    });
  });

  it('blocks requests with no Authorization header (401)', async () => {
    const res = await request(testApp).get('/protected');
    expect(res.status).toBe(401);
  });

  it('rejects invalid or expired token (401)', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Expired Token'));

    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', 'Bearer badtoken');
    expect(res.status).toBe(401);
  });

  it('allows valid token and attaches req.user', async () => {
    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', 'Bearer faketoken');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      uid: 'test-uid',
      email: 'test@test.com',
    });
  });
});
