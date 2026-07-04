// Firebase Admin SDK initialization.
// Prefers env-var credentials (for cloud deploy), falls back to a local
// serviceAccountKey.json (gitignored) for local development.
import { initializeApp, cert } from "firebase-admin/app";
import { readFileSync } from "fs";

function loadServiceAccount() {
  // Cloud path: full JSON blob in one env var (set in Render dashboard).
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
  // Local path: gitignored key file next to backend/.
  return JSON.parse(
    readFileSync(new URL("../../serviceAccountKey.json", import.meta.url))
  );
}

const firebaseAdmin = initializeApp({
  credential: cert(loadServiceAccount()),
});

export default firebaseAdmin;