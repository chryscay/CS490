import express from 'express';
import multer from 'multer';
import DocumentsController from '../../controllers/documents.controller.js';
import authMiddleware from '../../middleware/auth.middleware.js';

const router = express.Router();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 5 * 1024 * 1024,
	},
});

function uploadSingleFile(req, res, next) {
	upload.single('file')(req, res, (error) => {
		if (!error) {
			return next();
		}

		if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
			return res.status(400).json({ error: 'Uploaded file exceeds the 5MB limit' });
		}

		if (error instanceof multer.MulterError) {
			return res.status(400).json({ error: `Upload error: ${error.message}` });
		}

		return res.status(400).json({ error: 'Invalid upload payload' });
	});
}

router.use(authMiddleware);

router.get('/', DocumentsController.apiGetAllDocuments);
router.post('/upload', uploadSingleFile, DocumentsController.apiUploadDocument);

export default router;
