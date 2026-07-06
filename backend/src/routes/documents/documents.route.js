import express from 'express';
import DocumentsController from '../../controllers/documents.controller.js';
import authMiddleware from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', DocumentsController.apiGetAllDocuments);

export default router;
