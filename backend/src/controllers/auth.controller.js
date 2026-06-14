import UsersDAO from '../dao/usersDAO.js';
import { getAuth } from 'firebase-admin/auth';
import '../lib/firebase-admin.js';

export default class AuthController {
  static async apiAddUser(req, res) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({
          error: 'Authorization token required',
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = await getAuth().verifyIdToken(token);

      if (!req.body.displayName?.trim()) {
        return res.status(400).json({
          error: 'Display name is required',
        });
      }

      if (!decoded.email) {
        return res.status(400).json({
          error: 'Email is required',
        });
      }

      const userInfo = {
        firebaseUid: decoded.uid,
        email: decoded.email,
        displayName: req.body.displayName?.trim(),
      };

      const existingUser = await UsersDAO.findByFirebaseUid(decoded.uid);
      if (existingUser) {
        return res.status(409).json({
          message: 'User already exists',
        });
      }

      await UsersDAO.addUser(userInfo);

      return res.status(201).json({ message: 'User created' });
    } catch (error) {
      console.error('apiAddUser error: ', error);
      return res.status(500).json({ error: 'Failed to sync user' });
    }
  }
}
