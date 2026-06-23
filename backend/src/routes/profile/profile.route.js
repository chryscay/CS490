import express from 'express';
import ProfileController from '../../controllers/profile.controller.js';
import authMiddleware from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);

router
  .route('/')
  .get(ProfileController.apiGetProfile)
  .put(ProfileController.apiUpdateProfile);

router.route('/:section').put(ProfileController.apiUpdateProfileSection);

export default router;