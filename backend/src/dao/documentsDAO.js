import { ObjectId } from 'mongodb';

let documents;
const VALID_DOCUMENT_TYPES = new Set(['resume', 'coverLetter']);
const VALID_DOCUMENT_STATUSES = new Set(['active', 'archived']);

function normalizeJobId(jobId) {
  if (ObjectId.isValid(jobId)) {
    return new ObjectId(jobId);
  }
  return jobId;
}

function normalizeStatus(status) {
  if (status === undefined) {
    return undefined;
  }

  if (typeof status !== 'string') {
    throw new Error('Unsupported document status');
  }

  const normalizedStatus = status.trim();
  if (!VALID_DOCUMENT_STATUSES.has(normalizedStatus)) {
    throw new Error('Unsupported document status');
  }

  return normalizedStatus;
}

function normalizeTags(tags) {
  if (tags === undefined) {
    return undefined;
  }

  if (!Array.isArray(tags)) {
    throw new Error('Tags must be an array of strings');
  }

  if (tags.some((tag) => typeof tag !== 'string')) {
    throw new Error('Tags must be an array of strings');
  }

  const normalizedTags = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return [...new Set(normalizedTags)];
}

export default class DocumentsDAO {
  static async injectDB(conn) {
    if (documents) {
      return;
    }

    try {
      documents = await conn.db('ats').collection('documents');
      await documents.createIndex(
        { firebaseUid: 1, jobId: 1, type: 1 },
        { unique: true, name: 'owner_job_type_unique' }
      );
    } catch (e) {
      console.error(`Unable to connect in documentsDAO: ${e}`);
    }
  }

  static async saveDocumentVersion({ firebaseUid, jobId, type, title, text, status, tags }) {
    if (!VALID_DOCUMENT_TYPES.has(type)) {
      throw new Error('Unsupported document type');
    }

    const normalizedJobId = normalizeJobId(jobId);
    const normalizedStatus = normalizeStatus(status);
    const normalizedTags = normalizeTags(tags);
    const now = new Date();
    const nextVersionExpr = { $add: [{ $ifNull: ['$currentVersion', 0] }, 1] };
    const versionLabelExpr = {
      $concat: ['Version ', { $toString: nextVersionExpr }],
    };

    const updated = await documents.findOneAndUpdate(
      {
        firebaseUid,
        jobId: normalizedJobId,
        type,
      },
      [
        {
          $set: {
            firebaseUid: {
              $ifNull: ['$firebaseUid', { $literal: firebaseUid }],
            },
            jobId: {
              $ifNull: ['$jobId', { $literal: normalizedJobId }],
            },
            type: {
              $ifNull: ['$type', { $literal: type }],
            },
            title: { $literal: title },
            status:
              normalizedStatus === undefined
                ? { $ifNull: ['$status', { $literal: 'active' }] }
                : { $literal: normalizedStatus },
            tags:
              normalizedTags === undefined
                ? { $ifNull: ['$tags', { $literal: [] }] }
                : { $literal: normalizedTags },
            createdAt: {
              $ifNull: ['$createdAt', { $literal: now }],
            },
            updatedAt: { $literal: now },
            currentVersion: nextVersionExpr,
            versions: {
              $concatArrays: [
                { $ifNull: ['$versions', []] },
                [
                  {
                    version: nextVersionExpr,
                    label: versionLabelExpr,
                    text: { $literal: text },
                    createdAt: { $literal: now },
                    firebaseUid: { $literal: firebaseUid },
                    jobId: { $literal: normalizedJobId },
                    type: { $literal: type },
                  },
                ],
              ],
            },
          },
        },
      ],
      {
        upsert: true,
        returnDocument: 'after',
      }
    );

    return updated?.value ?? updated ?? null;
  }

  static async findByJobForOwner(firebaseUid, jobId) {
    const normalizedJobId = normalizeJobId(jobId);
    const docs = await documents
      .find({ firebaseUid, jobId: normalizedJobId })
      .toArray();
    // Return only the latest version's text per document, plus metadata.
    return docs.map((doc) => {
      const versions = doc.versions ?? [];
      const latest = versions.length > 0 ? versions[versions.length - 1] : null;
      return {
        _id: doc._id,
        type: doc.type,
        title: doc.title,
        currentVersion: doc.currentVersion,
        updatedAt: doc.updatedAt,
        text: latest?.text ?? '',
      };
    });
  }


  // S3-001/S3-006: all documents across all jobs for a user (resume + coverLetter only).
  // Returns status and tags so the frontend can filter/sort without a second fetch.
  static async findAllForOwner(firebaseUid) {
    const docs = await documents.find({ firebaseUid }).toArray();
    return docs
      .filter((doc) => VALID_DOCUMENT_TYPES.has(doc.type))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .map((doc) => ({
        _id: doc._id,
        jobId: doc.jobId,
        type: doc.type,
        title: doc.title,
        status: doc.status ?? 'active',
        tags: doc.tags ?? [],
        currentVersion: doc.currentVersion,
        updatedAt: doc.updatedAt,
      }));
  }

  // S3-005: fetch a specific version's text for export, owner-scoped.
  // If version is omitted, returns the latest. Ownership is enforced in the
  // query (firebaseUid), so cross-owner access returns null -> 404 upstream.
  // S3-007: rename only — no new version created (S3-BR-007).
  static async renameDocument(firebaseUid, documentId, newTitle) {
    const _id = ObjectId.isValid(documentId) ? new ObjectId(documentId) : documentId;
    const now = new Date();
    const result = await documents.findOneAndUpdate(
      { _id, firebaseUid },
      [{ $set: { title: { $literal: newTitle }, updatedAt: { $literal: now } } }],
      { returnDocument: 'after' }
    );
    const doc = result?.value ?? result ?? null;
    if (!doc?._id) return null;
    return {
      _id: doc._id,
      jobId: doc.jobId,
      type: doc.type,
      title: doc.title,
      status: doc.status ?? 'active',
      tags: doc.tags ?? [],
      currentVersion: doc.currentVersion,
      updatedAt: doc.updatedAt,
    };
  }

  // S3-007: duplicate — new doc starts at version 1 carrying the latest text (S3-BR-008).
  static async duplicateDocument(firebaseUid, documentId) {
    const _id = ObjectId.isValid(documentId) ? new ObjectId(documentId) : documentId;
    const original = await documents.findOne({ _id, firebaseUid });
    if (!original) return null;

    const versions = original.versions ?? [];
    const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;
    const latestText = latestVersion?.text ?? '';

    const now = new Date();
    const syntheticJobId = new ObjectId();

    const newDoc = {
      _id: new ObjectId(),
      firebaseUid,
      jobId: syntheticJobId,
      type: original.type,
      title: `Copy of ${original.title}`,
      status: original.status ?? 'active',
      tags: [...(original.tags ?? [])],
      currentVersion: 1,
      versions: [
        {
          version: 1,
          label: 'Version 1',
          text: latestText,
          createdAt: now,
          firebaseUid,
          jobId: syntheticJobId,
          type: original.type,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await documents.insertOne(newDoc);
    return {
      _id: newDoc._id,
      jobId: newDoc.jobId,
      type: newDoc.type,
      title: newDoc.title,
      status: newDoc.status,
      tags: newDoc.tags,
      currentVersion: newDoc.currentVersion,
      updatedAt: newDoc.updatedAt,
    };
  }

  static async findVersionForOwner(firebaseUid, documentId, version) {
    const _id = ObjectId.isValid(documentId)
      ? new ObjectId(documentId)
      : documentId;

    const doc = await documents.findOne({ _id, firebaseUid });
    if (!doc) {
      return null;
    }

    const versions = doc.versions ?? [];
    if (versions.length === 0) {
      return null;
    }

    let selected;
    if (version === undefined || version === null || version === '') {
      selected = versions[versions.length - 1];
    } else {
      const wanted = Number(version);
      selected = versions.find((v) => v.version === wanted);
      if (!selected) {
        return null;
      }
    }

    return {
      _id: doc._id,
      type: doc.type,
      title: doc.title,
      version: selected.version,
      text: selected.text ?? '',
    };



  }








 
}
