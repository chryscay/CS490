import { getAuth } from 'firebase-admin/auth';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.replace('Bearer ', '');

    const decoded = await getAuth().verifyIdToken(token);

    req.user = { uid: decoded.uid, email: decoded.email };

    next();
  } catch (e) {
    return res
      .status(401)
      .json({ error: `Invalid or expired token ${e.message}` });
  }
};

export default authMiddleware;
