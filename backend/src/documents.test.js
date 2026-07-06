import request from 'supertest';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import app from './app.js';
import DocumentsDAO from './dao/documentsDAO.js';

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

vi.mock('./dao/documentsDAO.js', () => ({
  default: {
    saveDocumentVersion: vi.fn(),
    findByJobForOwner: vi.fn(),
    findAllForOwner: vi.fn(),
  },
}));

describe('GET /api/documents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('returns all documents for the authenticated user (happy path)', async () => {
    DocumentsDAO.findAllForOwner.mockResolvedValue([
      {
        _id: 'doc-1',
        jobId: 'job-1',
        type: 'resume',
        title: 'Engineer Resume',
        currentVersion: 2,
        updatedAt: new Date('2026-06-01'),
      },
      {
        _id: 'doc-2',
        jobId: 'job-2',
        type: 'coverLetter',
        title: 'Engineer Cover Letter',
        currentVersion: 1,
        updatedAt: new Date('2026-05-01'),
      },
    ]);

    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(200);
    expect(res.body.documents).toHaveLength(2);
    expect(res.body.documents[0]).toMatchObject({ type: 'resume', title: 'Engineer Resume' });
    expect(res.body.documents[1]).toMatchObject({ type: 'coverLetter', title: 'Engineer Cover Letter' });
    expect(DocumentsDAO.findAllForOwner).toHaveBeenCalledWith('user-a');
  });

  it('returns empty array when the user has no documents', async () => {
    DocumentsDAO.findAllForOwner.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(200);
    expect(res.body.documents).toEqual([]);
  });

  it('returns 401 when no authorization token is provided', async () => {
    const res = await request(app).get('/api/documents');

    expect(res.status).toBe(401);
    expect(DocumentsDAO.findAllForOwner).not.toHaveBeenCalled();
  });

  it('only fetches documents for the authenticated user, not other users', async () => {
    DocumentsDAO.findAllForOwner.mockResolvedValue([]);

    await request(app)
      .get('/api/documents')
      .set('Authorization', 'Bearer faketoken');

    expect(DocumentsDAO.findAllForOwner).toHaveBeenCalledWith('user-a');
    expect(DocumentsDAO.findAllForOwner).not.toHaveBeenCalledWith('user-b');
  });
});
