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
    expect(res.body.error).toBe('Authorization required');
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

describe('POST /api/documents/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('stores an uploaded txt document for the authenticated user (happy path)', async () => {
    DocumentsDAO.saveDocumentVersion.mockResolvedValue({
      _id: 'doc-upload-1',
      jobId: 'job-1',
      type: 'resume',
      title: 'Uploaded Resume',
      currentVersion: 1,
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    });

    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', 'Bearer faketoken')
      .field('type', 'resume')
      .field('title', 'Uploaded Resume')
      .field('jobId', 'job-1')
      .attach('file', Buffer.from('My plain text resume content'), 'resume.txt');

    expect(res.status).toBe(201);
    expect(res.body.document).toMatchObject({
      _id: 'doc-upload-1',
      type: 'resume',
      title: 'Uploaded Resume',
      currentVersion: 1,
    });
    expect(DocumentsDAO.saveDocumentVersion).toHaveBeenCalledTimes(1);
    expect(DocumentsDAO.saveDocumentVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        firebaseUid: 'user-a',
        jobId: 'job-1',
        type: 'resume',
        title: 'Uploaded Resume',
      })
    );
    expect(
      DocumentsDAO.saveDocumentVersion.mock.calls[0][0].text
    ).toContain('My plain text resume content');
  });

  it('returns 400 when uploaded file is missing', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', 'Bearer faketoken')
      .field('type', 'resume');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('A document file is required');
    expect(DocumentsDAO.saveDocumentVersion).not.toHaveBeenCalled();
  });

  it('returns 400 when extracted text is empty', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', 'Bearer faketoken')
      .field('type', 'resume')
      .attach('file', Buffer.from('   \n\t'), 'resume.txt');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Uploaded file must contain extractable text');
    expect(DocumentsDAO.saveDocumentVersion).not.toHaveBeenCalled();
  });

  it('rejects unsupported file formats with a clear validation message', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', 'Bearer faketoken')
      .field('type', 'resume')
      .attach('file', Buffer.from('image-bytes'), 'resume.png');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(
      'Unsupported file format. Supported formats are PDF, DOCX, and TXT.'
    );
    expect(DocumentsDAO.saveDocumentVersion).not.toHaveBeenCalled();
  });

  it('rejects unsupported extension even when MIME type is spoofed as text/plain', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', 'Bearer faketoken')
      .field('type', 'resume')
      .attach('file', Buffer.from('not a txt file'), {
        filename: 'resume.png',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(
      'Unsupported file format. Supported formats are PDF, DOCX, and TXT.'
    );
    expect(DocumentsDAO.saveDocumentVersion).not.toHaveBeenCalled();
  });

  it('returns 400 when file exceeds upload size limit', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', 'Bearer faketoken')
      .field('type', 'resume')
      .attach('file', Buffer.alloc(6 * 1024 * 1024, 'a'), 'resume.txt');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Uploaded file exceeds the 5MB limit');
    expect(DocumentsDAO.saveDocumentVersion).not.toHaveBeenCalled();
  });

  it('rejects unsupported document business type', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', 'Bearer faketoken')
      .field('type', 'portfolio')
      .attach('file', Buffer.from('doc content'), 'resume.txt');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Unsupported document type');
    expect(DocumentsDAO.saveDocumentVersion).not.toHaveBeenCalled();
  });

  it('uses req.user.uid for ownership instead of any uid in request body', async () => {
    DocumentsDAO.saveDocumentVersion.mockResolvedValue({
      _id: 'doc-upload-2',
      jobId: 'job-2',
      type: 'coverLetter',
      title: 'Uploaded Cover Letter',
      currentVersion: 1,
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    });

    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', 'Bearer faketoken')
      .field('type', 'coverLetter')
      .field('firebaseUid', 'forged-user')
      .field('uid', 'forged-user')
      .attach('file', Buffer.from('Cover letter text content'), 'cover-letter.txt');

    expect(res.status).toBe(201);
    expect(DocumentsDAO.saveDocumentVersion).toHaveBeenCalledWith(
      expect.objectContaining({ firebaseUid: 'user-a' })
    );
    expect(DocumentsDAO.saveDocumentVersion).not.toHaveBeenCalledWith(
      expect.objectContaining({ firebaseUid: 'forged-user' })
    );
  });
});
