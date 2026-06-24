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
  .put(JobsController.apiUpdateJob);
  
router.post('/:id/transition', JobsController.apiTransitionStage); // SCRUM-45

export default router;



