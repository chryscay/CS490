import express from 'express';
import JobsController from '../../controllers/jobs.controller.js';
import authMiddleware from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);

router
  .route('/')
  .post(JobsController.apiCreateJob)
  .get(JobsController.apiGetJobs);

router
  .route('/:id')
  .get(JobsController.apiGetJobById)
  .put(JobsController.apiUpdateJob)
  .delete(JobsController.apiDeleteJob);

router.post('/:id/transition', JobsController.apiTransitionStage); // SCRUM-45
router.post('/:id/archive', JobsController.apiArchiveJob); // S2-014
router.post('/:id/restore', JobsController.apiRestoreJob); // S2-014
router.post('/:id/ai/draft', JobsController.apiDraftJob);
router.post('/:id/ai/rewrite', JobsController.apiRewriteDraft);
router.post('/:id/ai/research', JobsController.apiResearchCompany); // S3-011
router
  .route('/:id/documents')
  .post(JobsController.apiSaveDraftDocument)
  .get(JobsController.apiGetJobDocuments);
router.get('/:id/documents/:documentId/export', JobsController.apiExportJobDocument); // S3-005
router.post('/:id/interviews', JobsController.apiAddInterview); // S2-011
router.put('/:id/interviews/:interviewId', JobsController.apiUpdateInterview); // S2-011
router.post('/:id/followups', JobsController.apiAddFollowUp); // S2-012
router.put('/:id/followups/:followUpId', JobsController.apiUpdateFollowUp); // S2-012

router.patch('/:id/research', JobsController.apiUpdateResearchNotes); // S3-012
router.post('/:id/linked-documents', JobsController.apiLinkDocument); // S3-009
router.delete('/:id/linked-documents/:type', JobsController.apiUnlinkDocument); // S3-009

export default router;






