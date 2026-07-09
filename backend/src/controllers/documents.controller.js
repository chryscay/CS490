import DocumentsDAO from '../dao/documentsDAO.js';
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
  static async apiArchiveDocument(req, res) {
    try {
      const doc = await DocumentsDAO.archiveDocument(req.user.uid, req.params.id);
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      return res.status(200).json({ document: doc });
    } catch (error) {
      console.error('apiArchiveDocument error:', error);
      return res.status(500).json({ error: 'Failed to archive document' });
    }
  }

  static async apiRestoreDocument(req, res) {
    try {
      const doc = await DocumentsDAO.restoreDocument(req.user.uid, req.params.id);
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      return res.status(200).json({ document: doc });
    } catch (error) {
      console.error('apiRestoreDocument error:', error);
      return res.status(500).json({ error: 'Failed to restore document' });
    }
  }

  // S3-007: rename document title only — no version created (S3-BR-007).
  static async apiRenameDocument(req, res) {
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
      console.error('apiRenameDocument error:', error);
      return res.status(500).json({ error: 'Failed to rename document' });
    }
  }

  // S3-007: duplicate document — new record at version 1 with latest text.
  static async apiDuplicateDocument(req, res) {
    try {
      const uid = req.user.uid;
      const { id } = req.params;
      const doc = await DocumentsDAO.duplicateDocument(uid, id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }
      return res.status(201).json({ document: doc });
    } catch (error) {
      console.error('apiDuplicateDocument error:', error);
      return res.status(500).json({ error: 'Failed to duplicate document' });
    }
  }


  // S3-001: list all documents for the authenticated user.
  static async apiGetAllDocuments(req, res) {
    try {
      const uid = req.user.uid;
      const docs = await DocumentsDAO.findAllForOwner(uid);
      return res.status(200).json({ documents: docs });
    } catch (error) {
      console.error('apiGetAllDocuments error:', error);
      return res.status(500).json({ error: 'Failed to fetch documents' });
    }
  }

  static async apiUploadDocument(req, res) {
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
      console.error('apiUploadDocument error:', error);
      return res.status(500).json({ error: 'Failed to upload document' });
    }
  }
}
