import { describe, it, expect, beforeEach } from 'vitest';
import DocumentsDAO from './dao/documentsDAO.js';
import { ObjectId } from 'mongodb';

const storedDocuments = [];

const normalizeValue = (value) => {
  if (value && typeof value === 'object' && typeof value.toString === 'function') {
    return value.toString();
  }
  return value;
};

const matchesQuery = (document, query) => {
  return Object.entries(query).every(([key, value]) => {
    return normalizeValue(document[key]) === normalizeValue(value);
  });
};

const mockCollection = {
  findOne: async (query) => {
    return storedDocuments.find((document) => matchesQuery(document, query)) || null;
  },
  insertOne: async (document) => {
    const insertedId = new ObjectId();
    storedDocuments.push({ _id: insertedId, ...document });
    return { insertedId };
  },
  findOneAndUpdate: async (filter, update, options) => {
    const index = storedDocuments.findIndex((document) => matchesQuery(document, filter));
    if (index === -1) {
      return null;
    }

    const current = storedDocuments[index];
    const updated = {
      ...current,
      ...(update.$set || {}),
    };

    if (update.$push?.versions) {
      updated.versions = [...(updated.versions || []), update.$push.versions];
    }

    storedDocuments[index] = updated;

    if (options?.returnDocument === 'after') {
      return updated;
    }

    return current;
  },
};

const mockConn = {
  db: () => ({
    collection: () => mockCollection,
  }),
};

describe('DocumentsDAO.saveDocumentVersion', () => {
  beforeEach(async () => {
    storedDocuments.length = 0;
    await DocumentsDAO.injectDB(mockConn);
  });

  it('creates a new document with version 1', async () => {
    const result = await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Backend Engineer Resume',
      text: 'Edited resume draft text',
    });

    expect(result.currentVersion).toBe(1);
    expect(result.versions).toHaveLength(1);
    expect(result.versions[0]).toEqual(
      expect.objectContaining({
        version: 1,
        text: 'Edited resume draft text',
        createdAt: expect.any(Date),
      })
    );
    expect(storedDocuments).toHaveLength(1);
  });

  it('appends version 2 to an existing document and increments currentVersion', async () => {
    await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'coverLetter',
      title: 'Backend Engineer Cover Letter',
      text: 'First draft',
    });

    const result = await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'coverLetter',
      title: 'Backend Engineer Cover Letter v2',
      text: 'Second draft',
    });

    expect(result.currentVersion).toBe(2);
    expect(result.versions).toHaveLength(2);
    expect(result.versions[1]).toEqual(
      expect.objectContaining({
        version: 2,
        text: 'Second draft',
      })
    );
    expect(storedDocuments).toHaveLength(1);
  });

  it('keeps one document per owner-job-type tuple', async () => {
    await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Backend Engineer Resume',
      text: 'v1',
    });

    await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Backend Engineer Resume',
      text: 'v2',
    });

    await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'coverLetter',
      title: 'Backend Engineer Cover Letter',
      text: 'cover letter v1',
    });

    expect(storedDocuments).toHaveLength(2);
    const resumeDoc = storedDocuments.find((d) => d.type === 'resume');
    expect(resumeDoc.currentVersion).toBe(2);
  });

  it('stores ownership fields on the document record', async () => {
    const result = await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'owner-uid',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Title',
      text: 'Some text',
    });

    expect(result.firebaseUid).toBe('owner-uid');
    expect(result.type).toBe('resume');
    expect(result.jobId).toBeTruthy();
  });
});
