import express from 'express';
import multer from 'multer';
import DocumentsController from '../../controllers/documents.controller.js';
import authMiddleware from '../../middleware/auth.middleware.js';
import { ApiError } from '../../middleware/error.middleware.js';

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
			return next(new ApiError(400, 'Uploaded file exceeds the 5MB limit'));
		}

		if (error instanceof multer.MulterError) {
			return next(new ApiError(400, `Upload error: ${error.message}`));
		}

		return next(new ApiError(400, 'Invalid upload payload'));
	});
}

router.use(authMiddleware);

router.get('/', DocumentsController.apiGetAllDocuments);
router.post('/upload', uploadSingleFile, DocumentsController.apiUploadDocument);
router.patch('/:id', DocumentsController.apiRenameDocument);
router.post('/:id/archive', DocumentsController.apiArchiveDocument);
router.post('/:id/restore', DocumentsController.apiRestoreDocument);
router.post('/:id/duplicate', DocumentsController.apiDuplicateDocument);

export default router;
