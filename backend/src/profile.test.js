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
      education: [],
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
        education: [],
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
        education: [],
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

  it('saves valid education records with required fields', async () => {
    UsersDAO.updateProfile.mockResolvedValue({ modifiedCount: 1 });
    UsersDAO.getProfile.mockResolvedValue({
      email: 'a@test.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      summary: 'Mathematician',
      education: [
        {
          id: 'edu-1',
          schoolName: 'University of Oxford',
          degree: 'Bachelor of Arts',
          fieldOfStudy: 'Mathematics',
          startDate: '2018-09-01',
          endDate: '2021-06-30',
          description: 'Focused on pure mathematics',
        },
      ],
    });

    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', 'Bearer faketoken')
      .send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: '',
        city: '',
        state: '',
        summary: 'Mathematician',
        education: [
          {
            id: 'edu-1',
            schoolName: 'University of Oxford',
            degree: 'Bachelor of Arts',
            fieldOfStudy: 'Mathematics',
            startDate: '2018-09-01',
            endDate: '2021-06-30',
            description: 'Focused on pure mathematics',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(UsersDAO.updateProfile).toHaveBeenCalledWith(
      'user-a',
      expect.objectContaining({
        education: expect.arrayContaining([
          expect.objectContaining({
            schoolName: 'University of Oxford',
            degree: 'Bachelor of Arts',
            fieldOfStudy: 'Mathematics',
          }),
        ]),
      })
    );
  });

  it('rejects education records with missing required fields (400)', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', 'Bearer faketoken')
      .send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: '',
        city: '',
        state: '',
        summary: 'Mathematician',
        education: [
          {
            id: 'edu-1',
            schoolName: '',
            degree: 'Bachelor of Arts',
            fieldOfStudy: 'Mathematics',
            startDate: '2018-09-01',
            endDate: '2021-06-30',
            description: '',
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.errors['education[0].schoolName']).toBeDefined();
    expect(UsersDAO.updateProfile).not.toHaveBeenCalled();
  });

  it('rejects education records with endDate before startDate (400)', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', 'Bearer faketoken')
      .send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: '',
        city: '',
        state: '',
        summary: 'Mathematician',
        education: [
          {
            id: 'edu-1',
            schoolName: 'University of Oxford',
            degree: 'Bachelor of Arts',
            fieldOfStudy: 'Mathematics',
            startDate: '2021-06-30',
            endDate: '2021-01-01',
            description: '',
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.errors['education[0].endDate']).toBe(
      'End date cannot be earlier than start date'
    );
    expect(UsersDAO.updateProfile).not.toHaveBeenCalled();
  });

  it('trims education string fields before saving', async () => {
    UsersDAO.updateProfile.mockResolvedValue({ modifiedCount: 1 });
    UsersDAO.getProfile.mockResolvedValue({
      email: 'a@test.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      summary: 'Mathematician',
      education: [
        {
          id: 'edu-1',
          schoolName: 'University of Oxford',
          degree: 'Bachelor of Arts',
          fieldOfStudy: 'Mathematics',
          startDate: '2018-09-01',
          endDate: '',
          description: 'Focused on math',
        },
      ],
    });

    await request(app)
      .put('/api/profile')
      .set('Authorization', 'Bearer faketoken')
      .send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: '',
        city: '',
        state: '',
        summary: 'Mathematician',
        education: [
          {
            id: 'edu-1',
            schoolName: '  University of Oxford  ',
            degree: '  Bachelor of Arts  ',
            fieldOfStudy: '  Mathematics  ',
            startDate: '2018-09-01',
            endDate: '',
            description: '  Focused on math  ',
          },
        ],
      });

    const writtenFields = UsersDAO.updateProfile.mock.calls[0][1];
    expect(writtenFields.education[0].schoolName).toBe('University of Oxford');
    expect(writtenFields.education[0].degree).toBe('Bachelor of Arts');
    expect(writtenFields.education[0].fieldOfStudy).toBe('Mathematics');
    expect(writtenFields.education[0].description).toBe('Focused on math');
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

  it('saves skills section and trims skill values', async () => {
    UsersDAO.updateProfile.mockResolvedValue({ modifiedCount: 1 });
    UsersDAO.getProfile.mockResolvedValue({
      email: 'a@test.com',
      skills: [
        { id: 'skill-1', name: 'React', category: 'Frontend', proficiency: 'Advanced' },
      ],
    });

    const res = await request(app)
      .put('/api/profile/skills')
      .set('Authorization', 'Bearer faketoken')
      .send({
        skills: [
          {
            id: 'skill-1',
            name: '  React  ',
            category: '  Frontend  ',
            proficiency: '  Advanced  ',
          },
        ],
      });

    expect(res.status).toBe(200);
    const written = UsersDAO.updateProfile.mock.calls[0][1];
    expect(written.skills).toEqual([
      { id: 'skill-1', name: 'React', category: 'Frontend', proficiency: 'Advanced' },
    ]);
    expect(res.body.profile.skills[0].name).toBe('React');
  });

  it('rejects skill save when name is missing', async () => {
    const res = await request(app)
      .put('/api/profile/skills')
      .set('Authorization', 'Bearer faketoken')
      .send({ skills: [{ id: 'skill-1', name: ' ', category: 'Frontend', proficiency: 'Advanced' }] });

    expect(res.status).toBe(400);
    expect(res.body.errors['skills[0].name']).toBe('Skill name is required');
    expect(UsersDAO.updateProfile).not.toHaveBeenCalled();
  });

  it('rejects duplicate skills within a single save', async () => {
    const res = await request(app)
      .put('/api/profile/skills')
      .set('Authorization', 'Bearer faketoken')
      .send({
        skills: [
          { id: 'skill-1', name: 'React', category: 'Frontend', proficiency: 'Advanced' },
          { id: 'skill-2', name: 'react ', category: 'Frontend', proficiency: 'Intermediate' },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.errors['skills[1].name']).toBe('Duplicate skill');
    expect(UsersDAO.updateProfile).not.toHaveBeenCalled();
  });

  it('blocks unauthenticated section saves (401)', async () => {
    const res = await request(app).put('/api/profile/identity').send({ firstName: 'Ada' });

    expect(res.status).toBe(401);
    expect(UsersDAO.updateProfile).not.toHaveBeenCalled();
  });
});