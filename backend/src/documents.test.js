import request from 'supertest';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import app from './app.js';
import DocumentsDAO from './dao/documentsDAO.js';
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

vi.mock('./dao/documentsDAO.js', () => ({
  default: {
    saveDocumentVersion: vi.fn(),
    findByJobForOwner: vi.fn(),
    findAllForOwner: vi.fn(),
    findVersionForOwner: vi.fn(),
    listVersionsForOwner: vi.fn(),
    archiveDocument: vi.fn(),
    restoreDocument: vi.fn(),
    renameDocument: vi.fn(),
    duplicateDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
}));

vi.mock('./dao/jobsDAO.js', () => ({
  default: {
    clearLinkedDocumentReferences: vi.fn(),
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

describe('POST /api/documents/:id/archive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('returns 200 and archived document (happy path)', async () => {
    DocumentsDAO.archiveDocument.mockResolvedValue({
      _id: 'doc-1', type: 'resume', title: 'My Resume',
      status: 'archived', tags: [], currentVersion: 1, updatedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/documents/doc-1/archive')
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(200);
    expect(res.body.document.status).toBe('archived');
    expect(DocumentsDAO.archiveDocument).toHaveBeenCalledWith('user-a', 'doc-1');
    expect(DocumentsDAO.saveDocumentVersion).not.toHaveBeenCalled();
  });

  it('returns 404 when document does not exist or belongs to another user', async () => {
    DocumentsDAO.archiveDocument.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/documents/nonexistent/archive')
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Document not found');
  });

  it('returns 401 when no authorization token is provided', async () => {
    const res = await request(app).post('/api/documents/doc-1/archive');
    expect(res.status).toBe(401);
    expect(DocumentsDAO.archiveDocument).not.toHaveBeenCalled();
  });
});

describe('POST /api/documents/:id/restore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('returns 200 and restored document (happy path)', async () => {
    DocumentsDAO.restoreDocument.mockResolvedValue({
      _id: 'doc-1', type: 'resume', title: 'My Resume',
      status: 'active', tags: [], currentVersion: 1, updatedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/documents/doc-1/restore')
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(200);
    expect(res.body.document.status).toBe('active');
    expect(DocumentsDAO.restoreDocument).toHaveBeenCalledWith('user-a', 'doc-1');
    expect(DocumentsDAO.saveDocumentVersion).not.toHaveBeenCalled();
  });

  it('returns 404 when document does not exist or belongs to another user', async () => {
    DocumentsDAO.restoreDocument.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/documents/nonexistent/restore')
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Document not found');
  });

  it('returns 401 when no authorization token is provided', async () => {
    const res = await request(app).post('/api/documents/doc-1/restore');
    expect(res.status).toBe(401);
    expect(DocumentsDAO.restoreDocument).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/documents/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('returns 200 and the updated document when rename succeeds (happy path)', async () => {
    DocumentsDAO.renameDocument.mockResolvedValue({
      _id: 'doc-1',
      jobId: 'job-1',
      type: 'resume',
      title: 'New Title',
      status: 'active',
      tags: [],
      currentVersion: 1,
      updatedAt: new Date('2026-07-01'),
    });

    const res = await request(app)
      .patch('/api/documents/doc-1')
      .set('Authorization', 'Bearer faketoken')
      .send({ title: 'New Title' });

    expect(res.status).toBe(200);
    expect(res.body.document).toMatchObject({ _id: 'doc-1', title: 'New Title' });
    expect(DocumentsDAO.renameDocument).toHaveBeenCalledWith('user-a', 'doc-1', 'New Title');
  });

  it('renames metadata only and does not create a new version (S3-BR-007 regression)', async () => {
    DocumentsDAO.renameDocument.mockResolvedValue({
      _id: 'doc-1',
      jobId: 'job-1',
      type: 'resume',
      title: 'Retitled Resume',
      status: 'active',
      tags: [],
      currentVersion: 2,
      updatedAt: new Date('2026-07-02'),
    });

    const res = await request(app)
      .patch('/api/documents/doc-1')
      .set('Authorization', 'Bearer faketoken')
      .send({ title: 'Retitled Resume' });

    expect(res.status).toBe(200);
    expect(res.body.document.currentVersion).toBe(2);
    expect(DocumentsDAO.renameDocument).toHaveBeenCalledTimes(1);
    expect(DocumentsDAO.saveDocumentVersion).not.toHaveBeenCalled();
  });

  it('returns 404 when document does not exist or belongs to another user', async () => {
    DocumentsDAO.renameDocument.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/documents/nonexistent')
      .set('Authorization', 'Bearer faketoken')
      .send({ title: 'New Title' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Document not found');
  });

  it('returns 400 when title is missing or blank', async () => {
    const res = await request(app)
      .patch('/api/documents/doc-1')
      .set('Authorization', 'Bearer faketoken')
      .send({ title: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Title is required');
    expect(DocumentsDAO.renameDocument).not.toHaveBeenCalled();
  });

  it('returns 401 when no authorization token is provided', async () => {
    const res = await request(app)
      .patch('/api/documents/doc-1')
      .send({ title: 'New Title' });

    expect(res.status).toBe(401);
    expect(DocumentsDAO.renameDocument).not.toHaveBeenCalled();
  });
});

describe('POST /api/documents/:id/duplicate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('returns 201 and the duplicated document (happy path)', async () => {
    DocumentsDAO.duplicateDocument.mockResolvedValue({
      _id: 'doc-copy',
      jobId: 'synthetic-job-id',
      type: 'resume',
      title: 'Copy of My Resume',
      status: 'active',
      tags: [],
      currentVersion: 1,
      updatedAt: new Date('2026-07-01'),
    });

    const res = await request(app)
      .post('/api/documents/doc-1/duplicate')
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(201);
    expect(res.body.document).toMatchObject({ title: 'Copy of My Resume', currentVersion: 1 });
    expect(DocumentsDAO.duplicateDocument).toHaveBeenCalledWith('user-a', 'doc-1');
  });

  it('returns 404 when source document does not exist or belongs to another user', async () => {
    DocumentsDAO.duplicateDocument.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/documents/nonexistent/duplicate')
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Document not found');
  });

  it('returns 401 when no authorization token is provided', async () => {
    const res = await request(app)
      .post('/api/documents/doc-1/duplicate');

    expect(res.status).toBe(401);
    expect(DocumentsDAO.duplicateDocument).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/documents/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('permanently deletes an owned document and clears any job links to it (happy path)', async () => {
    DocumentsDAO.deleteDocument.mockResolvedValue({
      _id: 'doc-1',
      type: 'resume',
      title: 'My Resume',
    });

    const res = await request(app)
      .delete('/api/documents/doc-1')
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Document deleted');
    expect(DocumentsDAO.deleteDocument).toHaveBeenCalledWith('user-a', 'doc-1');
    expect(JobsDAO.clearLinkedDocumentReferences).toHaveBeenCalledWith('user-a', 'doc-1');
  });

  it('returns 404 and does not touch job links when the document does not exist or belongs to another user', async () => {
    DocumentsDAO.deleteDocument.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/documents/nonexistent')
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Document not found');
    expect(JobsDAO.clearLinkedDocumentReferences).not.toHaveBeenCalled();
  });

  it('returns 401 when no authorization token is provided', async () => {
    const res = await request(app).delete('/api/documents/doc-1');

    expect(res.status).toBe(401);
    expect(DocumentsDAO.deleteDocument).not.toHaveBeenCalled();
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

  it('returns 401 when upload is unauthenticated and does not call DAO', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .field('type', 'resume')
      .attach('file', Buffer.from('Resume body text'), 'resume.txt');

    expect(res.status).toBe(401);
    expect(DocumentsDAO.saveDocumentVersion).not.toHaveBeenCalled();
  });
});

describe('GET /api/documents/:id (S3-010)', () => {
  const DOC_ID = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('returns the latest version of an owned document (happy path)', async () => {
    DocumentsDAO.findVersionForOwner.mockResolvedValue({
      _id: DOC_ID,
      type: 'resume',
      title: 'My Resume',
      version: 2,
      text: 'Senior engineer with 10 years experience.',
    });

    const res = await request(app)
      .get(`/api/documents/${DOC_ID}`)
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(200);
    expect(res.body.document.text).toBe('Senior engineer with 10 years experience.');
    expect(res.body.document.version).toBe(2);
    expect(DocumentsDAO.findVersionForOwner).toHaveBeenCalledWith('user-a', DOC_ID, undefined);
  });

  it('returns 404 when the document does not exist or belongs to another user', async () => {
    DocumentsDAO.findVersionForOwner.mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/documents/${DOC_ID}`)
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Document not found');
  });

  it('returns 401 when no authorization token is provided', async () => {
    const res = await request(app).get(`/api/documents/${DOC_ID}`);

    expect(res.status).toBe(401);
    expect(DocumentsDAO.findVersionForOwner).not.toHaveBeenCalled();
  });

  it('passes a requested ?version= through to the DAO to fetch a prior version (C08)', async () => {
    DocumentsDAO.findVersionForOwner.mockResolvedValue({
      _id: DOC_ID,
      type: 'resume',
      title: 'My Resume',
      version: 1,
      text: 'Draft version.',
    });

    const res = await request(app)
      .get(`/api/documents/${DOC_ID}?version=1`)
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(200);
    expect(res.body.document.version).toBe(1);
    expect(DocumentsDAO.findVersionForOwner).toHaveBeenCalledWith('user-a', DOC_ID, '1');
  });

  it('returns 404 when the requested version does not exist', async () => {
    DocumentsDAO.findVersionForOwner.mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/documents/${DOC_ID}?version=99`)
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(404);
  });
});

describe('GET /api/documents/:id/versions (C08)', () => {
  const DOC_ID = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-a', email: 'a@test.com' });
  });

  it('returns version metadata (no text) newest-first for the version picker', async () => {
    DocumentsDAO.listVersionsForOwner.mockResolvedValue([
      { version: 2, label: 'Version 2', createdAt: '2026-07-01T00:00:00.000Z' },
      { version: 1, label: 'Version 1', createdAt: '2026-06-01T00:00:00.000Z' },
    ]);

    const res = await request(app)
      .get(`/api/documents/${DOC_ID}/versions`)
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(200);
    expect(res.body.versions).toHaveLength(2);
    expect(res.body.versions[0].version).toBe(2);
    expect(res.body.versions.every((v) => v.text === undefined)).toBe(true);
    expect(DocumentsDAO.listVersionsForOwner).toHaveBeenCalledWith('user-a', DOC_ID);
  });

  it('returns 404 when the document does not exist or belongs to another user', async () => {
    DocumentsDAO.listVersionsForOwner.mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/documents/${DOC_ID}/versions`)
      .set('Authorization', 'Bearer faketoken');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Document not found');
  });

  it('returns 401 when no authorization token is provided', async () => {
    const res = await request(app).get(`/api/documents/${DOC_ID}/versions`);

    expect(res.status).toBe(401);
    expect(DocumentsDAO.listVersionsForOwner).not.toHaveBeenCalled();
  });
});
