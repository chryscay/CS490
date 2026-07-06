import DocumentsDAO from '../dao/documentsDAO.js';

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
}
