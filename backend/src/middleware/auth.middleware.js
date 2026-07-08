import { getAuth } from 'firebase-admin/auth';
import { ApiError } from './error.middleware.js';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next(new ApiError(401, 'Authorization required'));
    }

    const token = authHeader.replace('Bearer ', '');

    const decoded = await getAuth().verifyIdToken(token);

    req.user = { uid: decoded.uid, email: decoded.email };

    return next();
  } catch (e) {
    return next(new ApiError(401, `Invalid or expired token ${e.message}`));
  }
};

export default authMiddleware;
