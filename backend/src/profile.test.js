import request from 'supertest';
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
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

describe('GET /api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('returns the authenticated user profile (happy path)', async () => {
    UsersDAO.getProfile.mockResolvedValue({
      email: 'a@test.com',
      fullName: 'Ada Lovelace',
      summary: 'Mathematician',
    });

    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(200);
    expect(UsersDAO.getProfile).toHaveBeenCalledWith('user-a');
    expect(res.body.profile.fullName).toBe('Ada Lovelace');
  });

  it('blocks unauthenticated requests (401)', async () => {
    const res = await request(app).get('/api/profile');

    expect(res.status).toBe(401);
    expect(UsersDAO.getProfile).not.toHaveBeenCalled();
  });
});

describe('PUT /api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('saves baseline fields for the authenticated user (happy path + persistence)', async () => {
    UsersDAO.updateProfile.mockResolvedValue({ modifiedCount: 1 });
    UsersDAO.getProfile.mockResolvedValue({
      email: 'a@test.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: '5550100123',
      city: 'London',
      state: 'LN',
      summary: 'Mathematician',
    });

    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', 'Bearer faketoken')
      .send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: '5550100123',
        city: 'London',
        state: 'LN',
        summary: 'Mathematician',
      });

    expect(res.status).toBe(200);
    expect(UsersDAO.updateProfile).toHaveBeenCalledWith(
      'user-a',
      expect.objectContaining({
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: '5550100123',
        city: 'London',
        state: 'LN',
        summary: 'Mathematician',
      })
    );
    expect(res.body.profile.firstName).toBe('Ada');
  });

  it('rejects missing required fields with field-level errors (400)', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', 'Bearer faketoken')
      .send({ phone: '555-0100' });

    expect(res.status).toBe(400);
    expect(res.body.errors.firstName).toBeDefined();
    expect(res.body.errors.lastName).toBeDefined();
    expect(res.body.errors.summary).toBeDefined();
    expect(UsersDAO.updateProfile).not.toHaveBeenCalled();
  });

  it('does not let the body overwrite identity fields', async () => {
    UsersDAO.updateProfile.mockResolvedValue({ modifiedCount: 1 });
    UsersDAO.getProfile.mockResolvedValue({
      email: 'a@test.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });

    await request(app)
      .put('/api/profile')
      .set('Authorization', 'Bearer faketoken')
      .send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        summary: 'Mathematician',
        firebaseUid: 'user-evil',
        email: 'evil@test.com',
      });

    const writtenFields = UsersDAO.updateProfile.mock.calls[0][1];
    expect(writtenFields.firebaseUid).toBeUndefined();
    expect(writtenFields.email).toBeUndefined();
  });
});
describe('PUT /api/profile/:section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('saves only the identity section fields (happy path + persistence)', async () => {
    UsersDAO.updateProfile.mockResolvedValue({ modifiedCount: 1 });
    UsersDAO.getProfile.mockResolvedValue({
      email: 'a@test.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: '5550100123',
      city: 'London',
      state: 'NY',
      summary: 'Mathematician',
    });

    const res = await request(app)
      .put('/api/profile/identity')
      .set('Authorization', 'Bearer faketoken')
      .send({ firstName: 'Ada', lastName: 'Lovelace', phone: '5550100123', city: 'London', state: 'NY' });

    expect(res.status).toBe(200);
    const written = UsersDAO.updateProfile.mock.calls[0][1];
    expect(written).toEqual(
      expect.objectContaining({
        firstName: 'Ada', lastName: 'Lovelace', phone: '5550100123', city: 'London', state: 'NY',
      })
    );
    // summary is not part of the identity section, so it must not be written
    expect(written.summary).toBeUndefined();
    // response reflects persisted state (re-fetched after write)
    expect(res.body.profile.firstName).toBe('Ada');
  });

  it('rejects the identity section with field-level errors (400)', async () => {
    const res = await request(app)
      .put('/api/profile/identity')
      .set('Authorization', 'Bearer faketoken')
      .send({ firstName: '', lastName: '', phone: '12' });

    expect(res.status).toBe(400);
    expect(res.body.errors.firstName).toBeDefined();
    expect(res.body.errors.lastName).toBeDefined();
    expect(res.body.errors.phone).toBeDefined();
    expect(UsersDAO.updateProfile).not.toHaveBeenCalled();
  });

  it('whitelists fields so the body cannot inject ownership keys', async () => {
    UsersDAO.updateProfile.mockResolvedValue({ modifiedCount: 1 });
    UsersDAO.getProfile.mockResolvedValue({ email: 'a@test.com', firstName: 'Ada', lastName: 'Lovelace' });

    await request(app)
      .put('/api/profile/identity')
      .set('Authorization', 'Bearer faketoken')
      .send({ firstName: 'Ada', lastName: 'Lovelace', firebaseUid: 'user-evil', email: 'evil@test.com', summary: 'sneaky' });

    const written = UsersDAO.updateProfile.mock.calls[0][1];
    expect(written.firebaseUid).toBeUndefined();
    expect(written.email).toBeUndefined();
    expect(written.summary).toBeUndefined();
  });

  it('returns 404 for an unknown section', async () => {
    const res = await request(app)
      .put('/api/profile/banana')
      .set('Authorization', 'Bearer faketoken')
      .send({ anything: 'x' });

    expect(res.status).toBe(404);
    expect(UsersDAO.updateProfile).not.toHaveBeenCalled();
  });

  it('blocks unauthenticated section saves (401)', async () => {
    const res = await request(app).put('/api/profile/identity').send({ firstName: 'Ada' });

    expect(res.status).toBe(401);
    expect(UsersDAO.updateProfile).not.toHaveBeenCalled();
  });
});