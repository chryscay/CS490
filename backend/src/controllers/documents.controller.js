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
