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
router.post('/:id/interviews', JobsController.apiAddInterview); // S2-011
router.put('/:id/interviews/:interviewId', JobsController.apiUpdateInterview); // S2-011
router.post('/:id/followups', JobsController.apiAddFollowUp); // S2-012
router.put('/:id/followups/:followUpId', JobsController.apiUpdateFollowUp); // S2-012

export default router;



