import { ObjectId } from 'mongodb';

let documents;
const VALID_DOCUMENT_TYPES = new Set(['resume', 'coverLetter']);

function normalizeJobId(jobId) {
  if (ObjectId.isValid(jobId)) {
    return new ObjectId(jobId);
  }
  return jobId;
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

  static async saveDocumentVersion({ firebaseUid, jobId, type, title, text }) {
    if (!VALID_DOCUMENT_TYPES.has(type)) {
      throw new Error('Unsupported document type');
    }

    const normalizedJobId = normalizeJobId(jobId);
    const now = new Date();
    const nextVersionExpr = { $add: [{ $ifNull: ['$currentVersion', 0] }, 1] };

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
                    text: { $literal: text },
                    createdAt: { $literal: now },
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
}
