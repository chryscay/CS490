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

const authMiddleware = (req, res, next) => {
  // No-op: passes through until Firebase Auth is wired up
  next();
};

export default authMiddleware;
