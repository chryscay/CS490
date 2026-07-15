import DocumentsDAO from '../dao/documentsDAO.js';
import JobsDAO from '../dao/jobsDAO.js';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

const VALID_DOCUMENT_TYPES = new Set(['resume', 'coverLetter']);
const SUPPORTED_UPLOAD_MESSAGE =
  'Unsupported file format. Supported formats are PDF, DOCX, and TXT.';

function getExtension(fileName = '') {
  const index = fileName.lastIndexOf('.');
  if (index < 0) {
    return '';
  }
  return fileName.slice(index).toLowerCase();
}

function resolveUploadFormat(file) {
  const extension = getExtension(file?.originalname);
  const mime = (file?.mimetype || '').toLowerCase();

  if (extension) {
    if (extension === '.txt') {
      return 'txt';
    }

    if (extension === '.pdf') {
      return 'pdf';
    }

    if (extension === '.docx') {
      return 'docx';
    }

    return null;
  }

  if (mime === 'text/plain') {
    return 'txt';
  }

  if (mime === 'application/pdf') {
    return 'pdf';
  }

  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }

  return null;
}

async function extractUploadedText(file, format) {
  if (format === 'txt') {
    return file.buffer.toString('utf8').trim();
  }

  if (format === 'pdf') {
    const parsed = await pdfParse(file.buffer);
    return (parsed.text || '').trim();
  }

  if (format === 'docx') {
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    return (parsed.value || '').trim();
  }

  return '';
}

function toSafeDocument(document) {
  return {
    _id: document._id,
    jobId: document.jobId,
    type: document.type,
    title: document.title,
    currentVersion: document.currentVersion,
    updatedAt: document.updatedAt,
  };
}

export default class DocumentsController {
  // S3-008: archive/restore — status only, versions untouched (S3-BR-009).
  static async apiArchiveDocument(req, res, next) {
    try {
      const doc = await DocumentsDAO.archiveDocument(req.user.uid, req.params.id);
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      return res.status(200).json({ document: doc });
    } catch (error) {
      return next(error);
    }
  }

  static async apiRestoreDocument(req, res, next) {
    try {
      const doc = await DocumentsDAO.restoreDocument(req.user.uid, req.params.id);
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      return res.status(200).json({ document: doc });
    } catch (error) {
      return next(error);
    }
  }

  // S3-007: rename document title only — no version created (S3-BR-007).
  static async apiRenameDocument(req, res, next) {
    try {
      const uid = req.user.uid;
      const { id } = req.params;
      const { title } = req.body;
      if (!title?.trim()) {
        return res.status(400).json({ error: 'Title is required' });
      }
      const doc = await DocumentsDAO.renameDocument(uid, id, title.trim());
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }
      return res.status(200).json({ document: doc });
    } catch (error) {
      return next(error);
    }
  }

  // S3-007: duplicate document — new record at version 1 with latest text.
  static async apiDuplicateDocument(req, res, next) {
    try {
      const uid = req.user.uid;
      const { id } = req.params;
      const doc = await DocumentsDAO.duplicateDocument(uid, id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }
      return res.status(201).json({ document: doc });
    } catch (error) {
      return next(error);
    }
  }

  // Permanent removal — distinct from archive (S3-BR-009). Clears any job's
  // link to this document so nothing is left pointing at a deleted document.
  static async apiDeleteDocument(req, res, next) {
    try {
      const uid = req.user.uid;
      const { id } = req.params;
      const deleted = await DocumentsDAO.deleteDocument(uid, id);
      if (!deleted) {
        return res.status(404).json({ error: 'Document not found' });
      }
      await JobsDAO.clearLinkedDocumentReferences(uid, id);
      return res.status(200).json({ message: 'Document deleted', id });
    } catch (error) {
      return next(error);
    }
  }


  // S3-010: fetch a single document's version text (latest by default, or ?version=N) for display in job detail.
  static async apiGetDocument(req, res, next) {
    try {
      const doc = await DocumentsDAO.findVersionForOwner(req.user.uid, req.params.id, req.query.version);
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      return res.status(200).json({ document: doc });
    } catch (error) {
      return next(error);
    }
  }

  // S3-008: list version metadata (version number, label, date) for the version-history picker.
  static async apiGetDocumentVersions(req, res, next) {
    try {
      const versions = await DocumentsDAO.listVersionsForOwner(req.user.uid, req.params.id);
      if (!versions) return res.status(404).json({ error: 'Document not found' });
      return res.status(200).json({ versions });
    } catch (error) {
      return next(error);
    }
  }

  // S3-001: list all documents for the authenticated user.
  static async apiGetAllDocuments(req, res, next) {
    try {
      const uid = req.user.uid;
      const docs = await DocumentsDAO.findAllForOwner(uid);
      return res.status(200).json({ documents: docs });
    } catch (error) {
      return next(error);
    }
  }

  static async apiUploadDocument(req, res, next) {
    try {
      const { type, title, jobId } = req.body;
      const file = req.file;

      if (!VALID_DOCUMENT_TYPES.has(type)) {
        return res.status(400).json({ error: 'Unsupported document type' });
      }

      if (!file) {
        return res.status(400).json({ error: 'A document file is required' });
      }

      const uploadFormat = resolveUploadFormat(file);
      if (!uploadFormat) {
        return res.status(400).json({ error: SUPPORTED_UPLOAD_MESSAGE });
      }

      const extractedText = await extractUploadedText(file, uploadFormat);
      if (!extractedText) {
        return res
          .status(400)
          .json({ error: 'Uploaded file must contain extractable text' });
      }

      const safeTitle = title?.trim()
        ? title.trim()
        : `${type === 'coverLetter' ? 'Cover Letter' : 'Resume'} Upload`;

      const document = await DocumentsDAO.saveDocumentVersion({
        firebaseUid: req.user.uid,
        jobId,
        type,
        title: safeTitle,
        text: extractedText,
      });

      if (!document) {
        return res.status(500).json({ error: 'Failed to save document' });
      }

      return res.status(201).json({ document: toSafeDocument(document) });
    } catch (error) {
      return next(error);
    }
  }
}
