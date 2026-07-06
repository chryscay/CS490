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

  // S3-001: all documents across all jobs for a user (resume + coverLetter only).
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
        currentVersion: doc.currentVersion,
        updatedAt: doc.updatedAt,
      }));
  }
}
