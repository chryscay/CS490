import express from 'express';
import multer from 'multer';
import DocumentsController from '../../controllers/documents.controller.js';
import authMiddleware from '../../middleware/auth.middleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

router.get('/', DocumentsController.apiGetAllDocuments);
router.post('/upload', upload.single('file'), DocumentsController.apiUploadDocument);

export default router;
