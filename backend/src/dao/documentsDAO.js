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

    const existing = await documents.findOne({
      firebaseUid,
      jobId: normalizedJobId,
      type,
    });

    if (!existing) {
      const createdDocument = {
        firebaseUid,
        jobId: normalizedJobId,
        type,
        title,
        currentVersion: 1,
        versions: [
          {
            version: 1,
            text,
            createdAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      const result = await documents.insertOne(createdDocument);
      return {
        _id: result.insertedId,
        ...createdDocument,
      };
    }

    const nextVersion = Number(existing.currentVersion || 0) + 1;
    const updated = await documents.findOneAndUpdate(
      {
        _id: existing._id,
        firebaseUid,
        jobId: normalizedJobId,
        type,
      },
      {
        $set: {
          title,
          currentVersion: nextVersion,
          updatedAt: now,
        },
        $push: {
          versions: {
            version: nextVersion,
            text,
            createdAt: now,
          },
        },
      },
      {
        returnDocument: 'after',
      }
    );

    return updated;
  }
}
