import { getAuth } from 'firebase-admin/auth';

// TODO: Firebase token verification middleware.
// This is a no-op stub. Replace with real implementation in the auth ticket (SCRUM-2).
//
// When implemented this middleware should:
//   1. Extract the Bearer token from the Authorization header
//   2. Verify the token with Firebase Admin SDK
//   3. Attach the decoded user (uid, email) to req.user
//   4. Confirm the requested resource belongs to that uid (ownership check)
//   5. Return 401 if the token is missing or invalid
//   6. Return 403 if the user does not own the requested resource

const authMiddleware = async (req, res, next) => {
  // No-op: passes through until Firebase Auth is wired up

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
