import UsersDAO from '../dao/usersDAO.js';
import { getAuth } from 'firebase-admin/auth';
import '../lib/firebase-admin.js';

export default class AuthController {
  static async apiAddUser(req, res, next) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({
          error: 'Authorization token required',
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = await getAuth().verifyIdToken(token);
      const username = req.body.username?.trim().toLowerCase();

      if (!username) {
        return res.status(400).json({
          error: 'Username is required',
        });
      }

      if (!/^[a-z0-9]{3,20}$/.test(username)) {
        return res.status(400).json({
          error:
            'Username must be 3-20 characters and contain only letters and numbers',
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
        username: username,
      };

      const existingUsername = await UsersDAO.findByUsername(username);

      if (existingUsername) {
        return res.status(409).json({
          error: 'Username already taken',
        });
      }

      const existingUser = await UsersDAO.findByFirebaseUid(decoded.uid);

      if (existingUser) {
        return res.status(409).json({
          message: 'User already exists',
        });
      }

      await UsersDAO.addUser(userInfo);

      return res.status(201).json({ message: 'User created' });
    } catch (error) {
      return next(error);
    }
  }

  static async apiCheckUsername(req, res, next) {
    try {
      const username = req.params.username?.trim().toLowerCase();

      if (!username) {
        return res.status(400).json({
          error: 'Username is required',
        });
      }

      const existingUser = await UsersDAO.findByUsername(username);

      return res.status(200).json({
        available: !existingUser,
      });
    } catch (error) {
      return next(error);
    }
  }
}
