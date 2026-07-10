import { describe, it, expect, beforeEach } from 'vitest';
import DocumentsDAO from './dao/documentsDAO.js';
import { ObjectId } from 'mongodb';

const storedDocuments = [];
let lastFindQuery = null;
let lastFindOneQuery = null;
let lastFindOneAndUpdateFilter = null;

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
  createIndex: async () => 'owner_job_type_unique',
  find: (query) => {
    lastFindQuery = query;
    return ({
    toArray: async () =>
      storedDocuments.filter((document) => matchesQuery(document, query)),
    });
  },
  findOne: async (query) => {
    lastFindOneQuery = query;
    return storedDocuments.find((document) => matchesQuery(document, query)) ?? null;
  },
  insertOne: async (doc) => {
    const stored = { ...doc };
    if (!stored._id) stored._id = new ObjectId();
    storedDocuments.push(stored);
    return { insertedId: stored._id };
  },
  findOneAndUpdate: async (filter, update, options) => {
    lastFindOneAndUpdateFilter = filter;
    const index = storedDocuments.findIndex((document) => matchesQuery(document, filter));
    if (index === -1 && !options?.upsert) {
      return { value: null };
    }

    const evaluate = (expr, sourceDocument) => {
      if (Array.isArray(expr)) {
        return expr.map((item) => evaluate(item, sourceDocument));
      }

      if (expr && typeof expr === 'object') {
        if ('$literal' in expr) {
          return expr.$literal;
        }
        if ('$ifNull' in expr) {
          const [left, right] = expr.$ifNull;
          const leftValue = evaluate(left, sourceDocument);
          return leftValue ?? evaluate(right, sourceDocument);
        }
        if ('$add' in expr) {
          return expr.$add
            .map((item) => evaluate(item, sourceDocument))
            .reduce((sum, value) => sum + Number(value), 0);
        }
        if ('$toString' in expr) {
          const value = evaluate(expr.$toString, sourceDocument);
          return value == null ? null : String(value);
        }
        if ('$concat' in expr) {
          const values = expr.$concat.map((item) => evaluate(item, sourceDocument));
          if (values.some((value) => value == null)) {
            return null;
          }
          return values.map((value) => String(value)).join('');
        }
        if ('$concatArrays' in expr) {
          return expr.$concatArrays.flatMap((item) => evaluate(item, sourceDocument));
        }

        const objectResult = {};
        Object.entries(expr).forEach(([key, value]) => {
          objectResult[key] = evaluate(value, sourceDocument);
        });
        return objectResult;
      }

      if (typeof expr === 'string' && expr.startsWith('$')) {
        return sourceDocument?.[expr.slice(1)];
      }

      return expr;
    };

    const current = index === -1 ? null : storedDocuments[index];
    const sourceDocument = current ? { ...current } : {};
    const setStage = Array.isArray(update)
      ? update.find((stage) => stage.$set)?.$set ?? {}
      : update.$set ?? {};

    const computedSet = {};
    Object.entries(setStage).forEach(([key, value]) => {
      computedSet[key] = evaluate(value, sourceDocument);
    });

    const updated = {
      ...(current ?? {}),
      ...computedSet,
    };

    if (!updated._id) {
      updated._id = new ObjectId();
    }

    if (index === -1) {
      storedDocuments.push(updated);
    } else {
      storedDocuments[index] = updated;
    }

    if (options?.returnDocument === 'after') {
      return { value: updated };
    }

    return { value: current };
  },
};

const mockConn = {
  db: () => ({
    collection: () => mockCollection,
  }),
};

beforeEach(() => {
  lastFindQuery = null;
  lastFindOneQuery = null;
  lastFindOneAndUpdateFilter = null;
});

describe('DocumentsDAO.saveDocumentVersion', () => {
  beforeEach(async () => {
    storedDocuments.length = 0;
    await DocumentsDAO.injectDB(mockConn);
  });

  it('stores default metadata for a new document', async () => {
    const result = await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Backend Engineer Resume',
      text: 'Edited resume draft text',
    });

    expect(result.firebaseUid).toBe('user-a');
    expect(result.jobId).toBeTruthy();
    expect(result.title).toBe('Backend Engineer Resume');
    expect(result.type).toBe('resume');
    expect(result.status).toBe('active');
    expect(result.tags).toEqual([]);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.currentVersion).toBe(1);
    expect(result.value).toBeUndefined();
    expect(result.versions).toHaveLength(1);
    expect(result.versions[0]).toEqual(
      expect.objectContaining({
        version: 1,
        label: 'Version 1',
        text: 'Edited resume draft text',
        createdAt: expect.any(Date),
        firebaseUid: 'user-a',
        type: 'resume',
      })
    );
    expect(normalizeValue(result.versions[0].jobId)).toBe(normalizeValue(result.jobId));
    expect(storedDocuments).toHaveLength(1);
  });

  it('normalizes tags by trimming, removing blanks, and deduplicating', async () => {
    const result = await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Resume',
      text: 'v1',
      tags: [' alpha ', '', 'beta', 'alpha', '   ', 'beta  '],
    });

    expect(result.tags).toEqual(['alpha', 'beta']);
  });

  it('throws on unsupported status', async () => {
    await expect(
      DocumentsDAO.saveDocumentVersion({
        firebaseUid: 'user-a',
        jobId: '507f1f77bcf86cd799439011',
        type: 'resume',
        title: 'Resume',
        text: 'v1',
        status: 'deleted',
      })
    ).rejects.toThrow('Unsupported document status');
  });

  it('throws when tags include non-string values', async () => {
    await expect(
      DocumentsDAO.saveDocumentVersion({
        firebaseUid: 'user-a',
        jobId: '507f1f77bcf86cd799439011',
        type: 'resume',
        title: 'Resume',
        text: 'v1',
        tags: ['valid', 123],
      })
    ).rejects.toThrow('Tags must be an array of strings');
  });

  it('persists existing status and tags when later saves omit metadata', async () => {
    await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Resume v1',
      text: 'First draft',
      status: 'archived',
      tags: ['alpha', 'beta'],
    });

    const result = await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Resume v2',
      text: 'Second draft',
    });

    expect(result.status).toBe('archived');
    expect(result.tags).toEqual(['alpha', 'beta']);
    expect(result.currentVersion).toBe(2);
  });

  it('updates the same archived document for the same owner-job-type and keeps one record', async () => {
    await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Resume v1',
      text: 'First draft',
      status: 'archived',
      tags: ['old'],
    });

    const result = await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Resume v2',
      text: 'Second draft',
    });

    expect(result.currentVersion).toBe(2);
    expect(result.status).toBe('archived');
    expect(result.tags).toEqual(['old']);
    expect(storedDocuments).toHaveLength(1);
  });

  it('appends version 2 to an existing document and increments currentVersion', async () => {
    const firstVersion = await DocumentsDAO.saveDocumentVersion({
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
    expect(result.value).toBeUndefined();
    expect(result.versions).toHaveLength(2);
    expect(result.versions[0]).toEqual(
      expect.objectContaining({
        version: 1,
        label: 'Version 1',
        createdAt: expect.any(Date),
        firebaseUid: 'user-a',
        type: 'coverLetter',
      })
    );
    expect(normalizeValue(result.versions[0].jobId)).toBe(normalizeValue(result.jobId));
    expect(result.versions[1]).toEqual(
      expect.objectContaining({
        version: 2,
        label: 'Version 2',
        text: 'Second draft',
        createdAt: expect.any(Date),
        firebaseUid: 'user-a',
        type: 'coverLetter',
      })
    );
    expect(normalizeValue(result.versions[1].jobId)).toBe(normalizeValue(result.jobId));
    expect(result.createdAt.getTime()).toBe(firstVersion.createdAt.getTime());
    expect(result.updatedAt).toBeInstanceOf(Date);
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

  it('allows different users to save the same jobId/type without collisions', async () => {
    await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Resume A',
      text: 'Draft A',
    });

    await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-b',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Resume B',
      text: 'Draft B',
    });

    expect(storedDocuments).toHaveLength(2);
    expect(storedDocuments.some((d) => d.firebaseUid === 'user-a')).toBe(true);
    expect(storedDocuments.some((d) => d.firebaseUid === 'user-b')).toBe(true);
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

  it('findByJobForOwner returns latest version text for owner docs', async () => {
    await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Resume',
      text: 'v1 text',
    });
    await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Resume',
      text: 'v2 text',
    });

    const docs = await DocumentsDAO.findByJobForOwner(
      'user-a',
      '507f1f77bcf86cd799439011'
    );

    expect(docs).toHaveLength(1);
    expect(docs[0].type).toBe('resume');
    expect(docs[0].currentVersion).toBe(2);
    expect(docs[0].text).toBe('v2 text');
    expect(docs[0].versions).toBeUndefined();
  });

  it('findByJobForOwner does not return another user docs', async () => {
    await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Resume',
      text: 'owner text',
    });

    const docs = await DocumentsDAO.findByJobForOwner(
      'user-b',
      '507f1f77bcf86cd799439011'
    );

    expect(docs).toEqual([]);
  });

  it('findByJobForOwner queries by firebaseUid and jobId', async () => {
    await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Resume',
      text: 'owner text',
    });

    await DocumentsDAO.findByJobForOwner('user-a', '507f1f77bcf86cd799439011');

    expect(lastFindQuery).toMatchObject({
      firebaseUid: 'user-a',
      jobId: expect.any(Object),
    });
  });


  describe('DocumentsDAO.findVersionForOwner', () => {
  beforeEach(async () => {
    storedDocuments.length = 0;
    await DocumentsDAO.injectDB(mockConn);
  });

  const JOB_ID = '507f1f77bcf86cd799439011';

  async function seedTwoVersions(firebaseUid = 'user-a') {
    await DocumentsDAO.saveDocumentVersion({
      firebaseUid, jobId: JOB_ID, type: 'resume', title: 'My Resume', text: 'v1 text',
    });
    const doc = await DocumentsDAO.saveDocumentVersion({
      firebaseUid, jobId: JOB_ID, type: 'resume', title: 'My Resume', text: 'v2 text',
    });
    return doc._id;
  }

  it('returns a specific version text for the owner (happy path)', async () => {
    const docId = await seedTwoVersions();
    const result = await DocumentsDAO.findVersionForOwner('user-a', docId, 1);
    expect(result.version).toBe(1);
    expect(result.text).toBe('v1 text');
    expect(result.title).toBe('My Resume');
  });

  it('defaults to the latest version when none is specified', async () => {
    const docId = await seedTwoVersions();
    const result = await DocumentsDAO.findVersionForOwner('user-a', docId);
    expect(result.version).toBe(2);
    expect(result.text).toBe('v2 text');
  });

  it('returns null for a version that does not exist', async () => {
    const docId = await seedTwoVersions();
    const result = await DocumentsDAO.findVersionForOwner('user-a', docId, 99);
    expect(result).toBeNull();
  });

  it("returns null for another owner's document (ownership isolation)", async () => {
    const docId = await seedTwoVersions('user-a');
    const result = await DocumentsDAO.findVersionForOwner('user-b', docId, 1);
    expect(result).toBeNull();
  });

  it('findVersionForOwner includes firebaseUid in the lookup filter', async () => {
    const docId = await seedTwoVersions('user-a');

    await DocumentsDAO.findVersionForOwner('user-a', docId, 2);

    expect(lastFindOneQuery).toMatchObject({
      _id: docId,
      firebaseUid: 'user-a',
    });
  });
});


});

describe('DocumentsDAO.archiveDocument / restoreDocument', () => {
  beforeEach(async () => {
    storedDocuments.length = 0;
    await DocumentsDAO.injectDB(mockConn);
  });

  async function seedDoc(overrides = {}) {
    return DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'My Resume',
      text: 'draft',
      ...overrides,
    });
  }

  it('archiveDocument sets status to archived and preserves version count (S3-BR-009)', async () => {
    await seedDoc();
    const original = await seedDoc(); // 2 versions now
    const versionCountBefore = storedDocuments[0].versions.length;
    const storedIdBefore = normalizeValue(storedDocuments[0]._id);
    const storedCountBefore = storedDocuments.length;

    const result = await DocumentsDAO.archiveDocument('user-a', original._id);

    expect(result.status).toBe('archived');
    expect(storedDocuments[0].versions).toHaveLength(versionCountBefore);
    expect(normalizeValue(storedDocuments[0]._id)).toBe(storedIdBefore);
    expect(storedDocuments).toHaveLength(storedCountBefore);
  });

  it('restoreDocument sets status back to active and preserves version count (S3-BR-009)', async () => {
    const archived = await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'My Resume',
      text: 'draft',
      status: 'archived',
    });
    const storedIdBefore = normalizeValue(storedDocuments[0]._id);
    const storedCountBefore = storedDocuments.length;

    const result = await DocumentsDAO.restoreDocument('user-a', archived._id);

    expect(result.status).toBe('active');
    expect(storedDocuments[0].versions).toHaveLength(1);
    expect(normalizeValue(storedDocuments[0]._id)).toBe(storedIdBefore);
    expect(storedDocuments).toHaveLength(storedCountBefore);
  });

  it('archiveDocument returns the correct metadata shape', async () => {
    const doc = await seedDoc({ tags: ['senior'], status: 'active' });

    const result = await DocumentsDAO.archiveDocument('user-a', doc._id);

    expect(result).toMatchObject({
      type: 'resume',
      title: 'My Resume',
      status: 'archived',
      tags: ['senior'],
      currentVersion: 1,
    });
    expect(result._id).toBeDefined();
    expect(result.text).toBeUndefined();
    expect(result.versions).toBeUndefined();
  });

  it('archiveDocument returns null when document belongs to another user', async () => {
    const doc = await seedDoc();
    const result = await DocumentsDAO.archiveDocument('user-b', doc._id);
    expect(result).toBeNull();
    expect(storedDocuments[0].status).toBe('active');
  });

  it('restoreDocument returns null when document does not exist', async () => {
    const result = await DocumentsDAO.restoreDocument('user-a', new ObjectId());
    expect(result).toBeNull();
  });
});

describe('DocumentsDAO.renameDocument', () => {
  beforeEach(async () => {
    storedDocuments.length = 0;
    await DocumentsDAO.injectDB(mockConn);
  });

  it('updates title without incrementing version or adding a version entry (S3-BR-007)', async () => {
    const original = await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Old Title',
      text: 'draft text',
    });

    const result = await DocumentsDAO.renameDocument('user-a', original._id, 'New Title');

    expect(result.title).toBe('New Title');
    expect(result.currentVersion).toBe(1);
    expect(storedDocuments[0].versions).toHaveLength(1);
    expect(storedDocuments).toHaveLength(1);
  });

  it('returns the updated metadata shape', async () => {
    const original = await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'coverLetter',
      title: 'Old Cover Letter',
      text: 'draft',
      status: 'archived',
      tags: ['senior'],
    });

    const result = await DocumentsDAO.renameDocument('user-a', original._id, 'Renamed Cover Letter');

    expect(result).toMatchObject({
      type: 'coverLetter',
      title: 'Renamed Cover Letter',
      status: 'archived',
      tags: ['senior'],
      currentVersion: 1,
    });
    expect(result._id).toBeDefined();
    expect(result.text).toBeUndefined();
    expect(result.versions).toBeUndefined();
  });

  it('returns null when the document does not exist', async () => {
    const result = await DocumentsDAO.renameDocument('user-a', new ObjectId(), 'New Title');
    expect(result).toBeNull();
  });

  it('returns null when the document belongs to a different user (ownership isolation)', async () => {
    const original = await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Resume',
      text: 'text',
    });

    const result = await DocumentsDAO.renameDocument('user-b', original._id, 'Stolen Title');

    expect(result).toBeNull();
    expect(storedDocuments[0].title).toBe('Resume');
  });

  it('scopes rename updates by firebaseUid in the write filter', async () => {
    const original = await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Resume',
      text: 'text',
    });

    await DocumentsDAO.renameDocument('user-a', original._id, 'Updated Title');

    expect(lastFindOneAndUpdateFilter).toMatchObject({
      _id: original._id,
      firebaseUid: 'user-a',
    });
  });
});

describe('DocumentsDAO.duplicateDocument', () => {
  beforeEach(async () => {
    storedDocuments.length = 0;
    await DocumentsDAO.injectDB(mockConn);
  });

  it('creates a new document with "Copy of" prefix and does not modify the original', async () => {
    const original = await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'My Resume',
      text: 'v1 text',
    });

    const duped = await DocumentsDAO.duplicateDocument('user-a', original._id);

    expect(duped.title).toBe('Copy of My Resume');
    expect(duped.type).toBe('resume');
    expect(duped.currentVersion).toBe(1);
    expect(storedDocuments).toHaveLength(2);
    expect(storedDocuments[0].title).toBe('My Resume');
  });

  it('new document starts at version 1 with latest text and full version metadata (S3-BR-008)', async () => {
    await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'My Resume',
      text: 'v1 text',
    });
    const original = await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'My Resume',
      text: 'v2 text',
    });

    await DocumentsDAO.duplicateDocument('user-a', original._id);

    const duped = storedDocuments[storedDocuments.length - 1];
    expect(duped.currentVersion).toBe(1);
    expect(duped.versions).toHaveLength(1);
    expect(duped.versions[0]).toMatchObject({
      version: 1,
      label: 'Version 1',
      text: 'v2 text',
      firebaseUid: 'user-a',
      type: 'resume',
    });
    expect(duped.versions[0].createdAt).toBeInstanceOf(Date);
  });

  it('duplicate creates a distinct document and keeps original version history unchanged', async () => {
    const original = await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Resume',
      text: 'v1',
      status: 'archived',
      tags: ['target-role'],
    });
    await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Resume',
      text: 'v2',
    });

    const duped = await DocumentsDAO.duplicateDocument('user-a', original._id);

    const source = storedDocuments.find((d) => normalizeValue(d._id) === normalizeValue(original._id));
    const copy = storedDocuments.find((d) => normalizeValue(d._id) === normalizeValue(duped._id));

    expect(normalizeValue(copy._id)).not.toBe(normalizeValue(source._id));
    expect(normalizeValue(copy.jobId)).not.toBe(normalizeValue(source.jobId));
    expect(copy.status).toBe('archived');
    expect(copy.tags).toEqual(['target-role']);
    expect(copy.currentVersion).toBe(1);
    expect(copy.versions).toHaveLength(1);
    expect(copy.versions[0].text).toBe('v2');
    expect(source.currentVersion).toBe(2);
    expect(source.versions).toHaveLength(2);
  });

  it('returns null when the document belongs to a different user (ownership isolation)', async () => {
    const original = await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'My Resume',
      text: 'text',
    });

    const result = await DocumentsDAO.duplicateDocument('user-b', original._id);

    expect(result).toBeNull();
    expect(storedDocuments).toHaveLength(1);
  });

  it('carries tags and status from the original', async () => {
    const original = await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Resume',
      text: 'text',
      status: 'archived',
      tags: ['senior', 'remote'],
    });

    const duped = await DocumentsDAO.duplicateDocument('user-a', original._id);

    expect(duped.status).toBe('archived');
    expect(duped.tags).toEqual(['senior', 'remote']);
  });
});

describe('DocumentsDAO.findAllForOwner', () => {
  beforeEach(async () => {
    storedDocuments.length = 0;
    await DocumentsDAO.injectDB(mockConn);
  });

  it('returns only documents belonging to the caller (cross-user isolation)', async () => {
    await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'My Resume',
      text: 'user-a text',
    });
    await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-b',
      jobId: '507f1f77bcf86cd799439011',
      type: 'coverLetter',
      title: 'Other Cover Letter',
      text: 'user-b text',
    });

    const docs = await DocumentsDAO.findAllForOwner('user-a');

    expect(docs).toHaveLength(1);
    expect(docs[0].title).toBe('My Resume');
  });

  it('returns the correct metadata shape including status and tags, without text or versions fields', async () => {
    await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'My Resume',
      text: 'draft text',
      status: 'active',
      tags: ['senior'],
    });

    const docs = await DocumentsDAO.findAllForOwner('user-a');

    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      type: 'resume',
      title: 'My Resume',
      currentVersion: 1,
      status: 'active',
      tags: ['senior'],
    });
    expect(docs[0]._id).toBeDefined();
    expect(docs[0].jobId).toBeDefined();
    expect(docs[0].updatedAt).toBeDefined();
    expect(docs[0].text).toBeUndefined();
    expect(docs[0].versions).toBeUndefined();
  });

  it('returns empty array when the user has no documents', async () => {
    await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'Resume',
      text: 'text',
    });

    const docs = await DocumentsDAO.findAllForOwner('user-b');

    expect(docs).toEqual([]);
  });

  it('excludes documents with unsupported types', async () => {
    storedDocuments.push({
      _id: new ObjectId(),
      firebaseUid: 'user-a',
      jobId: new ObjectId('507f1f77bcf86cd799439011'),
      type: 'other',
      title: 'Bad doc',
      currentVersion: 1,
      updatedAt: new Date(),
      versions: [],
    });

    const docs = await DocumentsDAO.findAllForOwner('user-a');

    expect(docs).toHaveLength(0);
  });

  it('queries findAllForOwner with firebaseUid ownership filter', async () => {
    await DocumentsDAO.findAllForOwner('user-a');

    expect(lastFindQuery).toEqual({ firebaseUid: 'user-a' });
  });
});

describe('DocumentsDAO.findOneForOwner (S3-009)', () => {
  beforeEach(async () => {
    storedDocuments.length = 0;
    await DocumentsDAO.injectDB(mockConn);
  });

  it('returns metadata shape for an owned document without text or versions', async () => {
    const saved = await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'My Resume',
      text: 'draft text',
    });

    const result = await DocumentsDAO.findOneForOwner('user-a', saved._id);

    expect(result).toMatchObject({ type: 'resume', title: 'My Resume', status: 'active' });
    expect(result.text).toBeUndefined();
    expect(result.versions).toBeUndefined();
  });

  it('returns null for another user\'s document (S3-BR-012)', async () => {
    const saved = await DocumentsDAO.saveDocumentVersion({
      firebaseUid: 'user-a',
      jobId: '507f1f77bcf86cd799439011',
      type: 'resume',
      title: 'My Resume',
      text: 'draft',
    });

    const result = await DocumentsDAO.findOneForOwner('user-b', saved._id);
    expect(result).toBeNull();
  });

  it('returns null for a document with an unsupported type', async () => {
    storedDocuments.push({
      _id: new ObjectId(),
      firebaseUid: 'user-a',
      jobId: new ObjectId('507f1f77bcf86cd799439011'),
      type: 'portfolio',
      title: 'My Portfolio',
      currentVersion: 1,
      updatedAt: new Date(),
    });
    const badDoc = storedDocuments[storedDocuments.length - 1];

    const result = await DocumentsDAO.findOneForOwner('user-a', badDoc._id);
    expect(result).toBeNull();
  });
});
