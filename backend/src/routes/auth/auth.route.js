import express from 'express';
import AuthController from '../../controllers/auth.controller.js';

const router = express.Router();

router.route('/register').post(AuthController.apiAddUser);
router.route('/check-username/:username').get(AuthController.apiCheckUsername);
export default router;
